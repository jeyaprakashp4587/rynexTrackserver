import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const base = "./harness/src/modules/trip";

const { default: TripRequests } = await import(`${base}/models/tripRequests.model.js`);
const { trip: Trip } = await import(`${base}/models/trip.model.js`);
const constants = await import(`${base}/constants/trip.constants.js`);
const { normalizeRecipients } = await import(`${base}/utils/normalizeRecipients.js`);
const { toObjectId } = await import(`${base}/utils/objectId.js`);
const pipelines = await import(`${base}/pipelines/trip.pipelines.js`);
const updates = await import(`${base}/pipelines/trip.updates.js`);
const { TRIP_ERRORS } = await import(`${base}/constants/trip.messages.js`);
const { formatTripStop } = await import(`${base}/utils/formatTripStop.js`);
const { parseStopProgress } = await import(`${base}/utils/parseStopProgress.js`);
const { parseVehiclesRequired } = await import(`${base}/utils/parseVehiclesRequired.js`);
const { buildTripAssignment } = await import(`${base}/utils/buildTripAssignment.js`);
const { findRecipientByUserId } = await import(`${base}/utils/findRecipient.js`);
const { default: TripStops } = await import(`${base}/models/tripStops.model.js`);

const id = () => new mongoose.Types.ObjectId();

test("candidate and assignment status enums contain no undefined values", () => {
  for (const list of [
    constants.REQUEST_STATUSES,
    constants.CANDIDATE_STATUSES,
    constants.ASSIGNMENT_STATUSES,
    constants.TRIP_LIFECYCLE_STATUSES,
  ]) {
    assert.ok(list.every((value) => typeof value === "string"));
  }
  const enumValues = TripRequests.schema.path("recipients").schema.path("status").enumValues;
  assert.ok(enumValues.every((value) => typeof value === "string"));
});

test("trip assignment ids are typed ObjectIds, not Mixed", () => {
  const assignment = Trip.schema.path("recipients").schema;
  for (const field of ["userId", "driverId", "driverUserId", "vehicleId", "assignedBy"]) {
    assert.equal(assignment.path(field).instance, "ObjectId", field);
  }
  assert.equal(assignment.path("assignedAt").instance, "Date");
});

test("trip declares a partial unique index on tripRequestId", () => {
  const index = Trip.schema
    .indexes()
    .find(([fields]) => Object.keys(fields).join() === "tripRequestId");
  assert.ok(index);
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, {
    tripRequestId: { $type: "objectId" },
  });
});

test("request defaults support a single-vehicle booking", () => {
  const doc = new TripRequests({ createdBy: [id()], recipients: [{ userId: id() }] });
  assert.equal(doc.vehiclesRequired, 1);
  assert.equal(doc.acceptedCount, 0);
  assert.equal(doc.recipients[0].status, constants.TRIP_STATUS.PENDING);
  assert.equal(doc.validateSync(), undefined);
});

test("request rejects invalid candidate status and vehiclesRequired", () => {
  const doc = new TripRequests({
    createdBy: [id()],
    vehiclesRequired: 0,
    recipients: [{ userId: id(), status: "TIMEOUT" }],
  });
  const error = doc.validateSync();
  assert.ok(error.errors["vehiclesRequired"]);
  assert.ok(error.errors["recipients.0.status"]);
});

test("normalizeRecipients casts ids, dedupes and rejects bad input", () => {
  const creator = id();
  const [first] = normalizeRecipients(
    [{ userId: id().toString(), vehicleId: id().toString() }],
    creator.toString()
  );
  assert.ok(first.userId instanceof mongoose.Types.ObjectId);
  assert.ok(first.vehicleId instanceof mongoose.Types.ObjectId);
  assert.equal(first.driverId, undefined);
  assert.equal(first.status, constants.TRIP_STATUS.PENDING);

  const dup = id().toString();
  assert.throws(
    () => normalizeRecipients([{ userId: dup }, { userId: dup }], creator),
    { message: TRIP_ERRORS.DUPLICATE_RECIPIENT }
  );
  assert.throws(() => normalizeRecipients([], creator), { message: TRIP_ERRORS.RECIPIENT_REQUIRED });
  assert.throws(() => normalizeRecipients([{ userId: "nope" }], creator), { message: TRIP_ERRORS.INVALID_RECIPIENT_USER_ID });
});

test("toObjectId rejects invalid values", () => {
  assert.throws(() => toObjectId("123", TRIP_ERRORS.INVALID_TRIP_ID), { message: TRIP_ERRORS.INVALID_TRIP_ID });
  assert.throws(() => toObjectId(undefined, TRIP_ERRORS.INVALID_TRIP_ID), { message: TRIP_ERRORS.INVALID_TRIP_ID });
  assert.ok(toObjectId(id().toString(), TRIP_ERRORS.INVALID_TRIP_ID) instanceof mongoose.Types.ObjectId);
});

test("request list pipeline only matches open requests", () => {
  const [match] = pipelines.buildTripRequestListPipeline(id().toString());
  assert.deepEqual(match.$match.status, { $in: constants.REQUEST_OPEN_STATUSES });
});

test("driver current-trip pipeline excludes ended trips", () => {
  const [match] = pipelines.buildDriverCurrentTripPipeline(id().toString());
  assert.deepEqual(match.$match.isTripEnded, { $ne: true });
});

test("formatTripStop builds GeoJSON points and rejects bad coordinates", () => {
  const [stop] = formatTripStop([
    { locationName: "A", stopType: "PICKUP", coords: { lat: 12.9, lon: 80.2 }, contactPhone: "1" },
  ]);
  assert.deepEqual(stop.coords, { type: "Point", coordinates: [80.2, 12.9] });
  assert.equal(stop.sequence, 1);
  assert.throws(
    () => formatTripStop([{ stopType: "DROP", coords: { lat: "x", lon: 1 } }]),
    { message: TRIP_ERRORS.INVALID_STOP_COORDINATES }
  );
});

test("tripStops keeps stop-level contacts and no longer defaults arrival times", () => {
  const stopPath = TripStops.schema.path("stops").schema;
  assert.ok(stopPath.path("contactPerson"));
  assert.ok(stopPath.path("contactPhone"));
  const meta = stopPath.path("recipientsMeta").schema;
  assert.equal(meta.path("arrivedAt").defaultValue, undefined);
  assert.equal(meta.path("completedAt").defaultValue, undefined);
  assert.ok(TripStops.schema.indexes().some(([f]) => Object.keys(f).join() === "tripId"));
});

test("parseStopProgress validates and normalizes input", () => {
  const tripId = id().toString();
  const parsed = parseStopProgress({ tripId, stopSequence: 2, status: "COMPLETED", podImage: "a.jpg" });
  assert.deepEqual(parsed.proofPhotos, ["a.jpg"]);
  assert.ok(parsed.tripId instanceof mongoose.Types.ObjectId);
  assert.throws(() => parseStopProgress({ tripId, stopSequence: 0, status: "COMPLETED" }), { message: TRIP_ERRORS.INVALID_STOP_SEQUENCE });
  assert.throws(() => parseStopProgress({ tripId, stopSequence: 1, status: "NOPE" }), { message: TRIP_ERRORS.INVALID_STOP_STATUS });
  assert.throws(() => parseStopProgress({ tripId, stopSequence: 1, status: "ARRIVED", podImage: [1] }), { message: TRIP_ERRORS.INVALID_PROOF_PHOTOS });
  assert.throws(() => parseStopProgress({ tripId: "bad", stopSequence: 1, status: "ARRIVED" }), { message: TRIP_ERRORS.INVALID_TRIP_ID });
});

test("parseVehiclesRequired defaults, validates and caps by recipients", () => {
  assert.equal(parseVehiclesRequired(undefined, 3), 1);
  assert.equal(parseVehiclesRequired("2", 3), 2);
  assert.throws(() => parseVehiclesRequired(0, 3), { message: TRIP_ERRORS.INVALID_VEHICLES_REQUIRED });
  assert.throws(() => parseVehiclesRequired(4, 3), { message: TRIP_ERRORS.VEHICLES_EXCEED_RECIPIENTS });
});

test("buildTripAssignment copies candidate data and marks it accepted", () => {
  const userId = id();
  const candidate = { driverId: id(), vehicleId: id(), assignedBy: id(), assignedAt: new Date(1), acceptedAt: new Date(2) };
  const assignment = buildTripAssignment(candidate, userId);
  assert.equal(assignment.status, constants.TRIP_STATUS.ACCEPTED);
  assert.equal(assignment.assignedAt.getTime(), 1);
  assert.equal(assignment.acceptedAt.getTime(), 2);
  assert.ok(assignment._id);
});

test("findRecipientByUserId matches by string or ObjectId", () => {
  const userId = id();
  const recipients = [{ userId: id() }, { userId }];
  assert.equal(findRecipientByUserId(recipients, userId.toString()), recipients[1]);
  assert.equal(findRecipientByUserId(undefined, userId), undefined);
});

test("claim filter enforces open status, pending candidate and quota", () => {
  const requestId = id();
  const userId = id();
  const filter = updates.buildClaimAcceptanceFilter(requestId, userId);
  assert.deepEqual(filter.status, { $in: constants.REQUEST_OPEN_STATUSES });
  assert.deepEqual(filter.recipients, { $elemMatch: { userId, status: constants.TRIP_STATUS.PENDING } });
  assert.ok(filter.$expr.$lt);
  assert.equal(updates.buildClaimAcceptanceUpdate(userId).length, 2);
});

test("event builders keep the {event,data,timestamp} envelope for every lifecycle event", async () => {
  const events = await import(`${base}/events/trip.events.js`);
  const builders = {
    [constants.TRIP_EVENT_TYPES.CREATED]: events.buildTripCreated,
    [constants.TRIP_EVENT_TYPES.UPDATED]: events.buildTripUpdated,
    [constants.TRIP_EVENT_TYPES.ACCEPTED]: events.buildTripAccepted,
    [constants.TRIP_EVENT_TYPES.ASSIGNED]: events.buildTripAssigned,
    [constants.TRIP_EVENT_TYPES.REJECTED]: events.buildTripRejected,
    [constants.TRIP_EVENT_TYPES.FULFILLED]: events.buildTripFulfilled,
    [constants.TRIP_EVENT_TYPES.STOP_UPDATED]: events.buildTripStopUpdated,
  };
  for (const [type, build] of Object.entries(builders)) {
    const message = build({ sample: true });
    assert.equal(message.event, type);
    assert.deepEqual(message.data, { sample: true });
    assert.ok(!Number.isNaN(Date.parse(message.timestamp)));
  }
});

test("publisher swallows broker failures and publishes to the trip topic", async () => {
  const kafka = await import("./harness/src/kafka/index.js");
  const publisher = await import(`${base}/events/trip.publisher.js`);
  kafka.published.length = 0;
  await publisher.publishTripAssigned({ a: 1 });
  assert.equal(kafka.published[0].topic, "trip");
  assert.equal(kafka.published[0].message.event, constants.TRIP_EVENT_TYPES.ASSIGNED);
  kafka.failNext(1);
  await assert.doesNotReject(publisher.publishTripRejected({ a: 1 }));
  assert.equal(kafka.published.length, 1);
});
