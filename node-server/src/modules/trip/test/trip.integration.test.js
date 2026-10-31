import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const base = "./harness/src/modules/trip";
const { DB1 } = await import("./harness/src/config/db.js");
const kafka = await import("./harness/src/kafka/index.js");
const service = await import(`${base}/services/trip.services.js`);
const { default: TripRequests } = await import(`${base}/models/tripRequests.model.js`);
const { trip: Trip } = await import(`${base}/models/trip.model.js`);
const { default: TripStops } = await import(`${base}/models/tripStops.model.js`);
const { TRIP_EVENT_TYPES, TRIP_STATUS, TRIP_STOP_STATUS } = await import(`${base}/constants/trip.constants.js`);
const { TRIP_ERRORS, TRIP_RESPONSES } = await import(`${base}/constants/trip.messages.js`);

let replSet;
const id = () => new mongoose.Types.ObjectId();

const stops = [
  { locationName: "A", stopType: "PICKUP", coords: { lat: 12.9, lon: 80.2 } },
  { locationName: "B", stopType: "DROP", coords: { lat: 13.0, lon: 80.3 } },
];

const createBooking = async ({ customer = id(), candidates, vehiclesRequired, requestType }) => {
  const request = await service.createTripRequest({
    userId: customer,
    requestType,
    body: {
      data: {
        tripMode: "MULTI_STOP",
        bookingType: "INDEPENDENT_TRIP",
        vehiclesRequired,
        recipients: candidates.map((userId) => ({
          userId,
          driverId: id(),
          vehicleId: id(),
        })),
        stops,
      },
    },
  });
  return request;
};

before(async () => {
  if (process.env.MONGO_URI) {
    await DB1.openUri(process.env.MONGO_URI);
  } else {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await DB1.openUri(replSet.getUri());
  }
  await Promise.all([TripRequests.init(), Trip.init(), TripStops.init()]);
});

after(async () => {
  await DB1.close();
  if (replSet) await replSet.stop();
});

beforeEach(async () => {
  await Promise.all([TripRequests.deleteMany({}), Trip.deleteMany({}), TripStops.deleteMany({})]);
  kafka.published.length = 0;
  kafka.failNext(0);
});

test("creating a booking stores candidates, stop mode and defaults", async () => {
  const [a, b] = [id(), id()];
  const request = await createBooking({ candidates: [a, b] });
  const stored = await TripRequests.findById(request._id);
  assert.equal(stored.status, TRIP_STATUS.PENDING);
  assert.equal(stored.tripStopMode, "MULTI_STOP");
  assert.equal(stored.vehiclesRequired, 1);
  assert.equal(stored.acceptedCount, 0);
  assert.equal(await TripStops.countDocuments({ tripRequestId: request._id }), 1);
  assert.equal(await Trip.countDocuments({}), 0);
});

test("owner-created work starts as WAITING_FOR_DRIVER and a driver can accept it", async () => {
  const driver = id();
  const request = await createBooking({ candidates: [driver], requestType: "OWNER" });
  assert.equal(request.status, TRIP_STATUS.WAITING_FOR_DRIVER);
  const result = await service.acceptTripRequestForDriver({ userId: driver, tripId: request._id.toString() });
  assert.equal(result.message, TRIP_RESPONSES.ACCEPTED);
});

test("owner assignment replaces only the owner's candidate entry and requires being a candidate", async () => {
  const [owner, otherOwner, outsider, driver] = [id(), id(), id(), id()];
  const request = await createBooking({ candidates: [owner, otherOwner] });
  await assert.rejects(
    service.acceptTripRequestForOwner({
      userId: outsider,
      tripId: request._id.toString(),
      body: { recipients: [{ userId: driver }] },
    }),
    { message: TRIP_ERRORS.NOT_ALLOWED_TO_ASSIGN }
  );
  const result = await service.acceptTripRequestForOwner({
    userId: owner,
    tripId: request._id.toString(),
    body: { recipients: [{ userId: driver, driverId: id(), vehicleId: id() }] },
  });
  assert.equal(result.message, TRIP_RESPONSES.ASSIGNED);
  const stored = await TripRequests.findById(request._id);
  assert.equal(stored.status, TRIP_STATUS.WAITING_FOR_DRIVER);
  const users = stored.recipients.map((r) => r.userId.toString()).sort();
  assert.deepEqual(users, [otherOwner.toString(), driver.toString()].sort());
});

test("two recipients accepting an exclusive booking concurrently: exactly one wins", async () => {
  const [a, b] = [id(), id()];
  const request = await createBooking({ candidates: [a, b] });
  const settled = await Promise.allSettled([
    service.acceptTripRequestForDriver({ userId: a, tripId: request._id.toString() }),
    service.acceptTripRequestForDriver({ userId: b, tripId: request._id.toString() }),
  ]);
  assert.equal(settled.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await Trip.countDocuments({ tripRequestId: request._id }), 1);
  const trip = await Trip.findOne({ tripRequestId: request._id });
  assert.equal(trip.recipients.length, 1);
  const stored = await TripRequests.findById(request._id);
  assert.equal(stored.status, TRIP_STATUS.ACCEPTED);
  assert.equal(stored.acceptedCount, 1);
  assert.ok(stored.recipients.every((r) => r.status !== TRIP_STATUS.PENDING));
});

test("many concurrent acceptors never produce more than one assignment", async () => {
  const candidates = Array.from({ length: 8 }, id);
  const request = await createBooking({ candidates });
  await Promise.allSettled(
    candidates.map((userId) =>
      service.acceptTripRequestForDriver({ userId, tripId: request._id.toString() })
    )
  );
  const trips = await Trip.find({ tripRequestId: request._id });
  assert.equal(trips.length, 1);
  assert.equal(trips[0].recipients.length, 1);
});

test("retrying an accept does not duplicate trips, assignments or stop metadata", async () => {
  const driver = id();
  const request = await createBooking({ candidates: [driver, id()] });
  const first = await service.acceptTripRequestForDriver({ userId: driver, tripId: request._id.toString() });
  const second = await service.acceptTripRequestForDriver({ userId: driver, tripId: request._id.toString() });
  assert.equal(first.trip._id.toString(), second.trip._id.toString());
  assert.equal(await Trip.countDocuments({ tripRequestId: request._id }), 1);
  const trip = await Trip.findOne({ tripRequestId: request._id });
  assert.equal(trip.recipients.length, 1);
  const tripStops = await TripStops.findOne({ tripRequestId: request._id });
  for (const stop of tripStops.stops) {
    assert.equal(stop.recipientsMeta.length, 1);
    assert.equal(stop.recipientsMeta[0].recipientId.toString(), trip.recipients[0]._id.toString());
  }
});

test("a crashed accept (claimed but no trip yet) is completed by retrying", async () => {
  const driver = id();
  const request = await createBooking({ candidates: [driver] });
  const repo = await import(`${base}/repositories/trip.repositories.js`);
  await repo.claimRecipientAcceptance({ tripRequestId: request._id, userId: driver });
  assert.equal(await Trip.countDocuments({}), 0);
  const result = await service.acceptTripRequestForDriver({ userId: driver, tripId: request._id.toString() });
  assert.equal(result.message, TRIP_RESPONSES.ACCEPTED);
  assert.equal(await Trip.countDocuments({ tripRequestId: request._id }), 1);
});

test("rejection updates only that candidate; last rejection closes the request", async () => {
  const [a, b] = [id(), id()];
  const request = await createBooking({ candidates: [a, b] });
  await service.rejectTripRequestForDriver({ userId: a, tripId: request._id.toString() });
  let stored = await TripRequests.findById(request._id);
  assert.equal(stored.status, TRIP_STATUS.PENDING);
  assert.equal(stored.recipients.find((r) => r.userId.equals(a)).status, TRIP_STATUS.REJECTED);
  assert.equal(stored.recipients.find((r) => r.userId.equals(b)).status, TRIP_STATUS.PENDING);
  await service.rejectTripRequestForDriver({ userId: b, tripId: request._id.toString() });
  stored = await TripRequests.findById(request._id);
  assert.equal(stored.status, TRIP_STATUS.REJECTED);
  await assert.rejects(
    service.acceptTripRequestForDriver({ userId: b, tripId: request._id.toString() }),
    { message: TRIP_ERRORS.NO_LONGER_AVAILABLE }
  );
});

test("multi-vehicle booking: candidates accept independently until the quota is filled", async () => {
  const candidates = [id(), id(), id()];
  const request = await createBooking({ candidates, vehiclesRequired: 2 });
  await service.acceptTripRequestForDriver({ userId: candidates[0], tripId: request._id.toString() });
  let stored = await TripRequests.findById(request._id);
  assert.equal(stored.status, TRIP_STATUS.PENDING);
  assert.equal(stored.acceptedCount, 1);
  await service.acceptTripRequestForDriver({ userId: candidates[1], tripId: request._id.toString() });
  stored = await TripRequests.findById(request._id);
  assert.equal(stored.status, TRIP_STATUS.ACCEPTED);
  assert.equal(stored.acceptedCount, 2);
  assert.equal(stored.recipients.find((r) => r.userId.equals(candidates[2])).status, TRIP_STATUS.EXPIRED);
  await assert.rejects(
    service.acceptTripRequestForDriver({ userId: candidates[2], tripId: request._id.toString() }),
    (error) => [TRIP_ERRORS.NO_LONGER_AVAILABLE, TRIP_ERRORS.ALREADY_ACCEPTED].includes(error.message)
  );
  const trip = await Trip.findOne({ tripRequestId: request._id });
  assert.equal(trip.recipients.length, 2);
  assert.equal(await Trip.countDocuments({ tripRequestId: request._id }), 1);
});

test("stop progress is independent per assigned vehicle", async () => {
  const [a, b] = [id(), id()];
  const request = await createBooking({ candidates: [a, b], vehiclesRequired: 2 });
  await service.acceptTripRequestForDriver({ userId: a, tripId: request._id.toString() });
  await service.acceptTripRequestForDriver({ userId: b, tripId: request._id.toString() });
  const trip = await Trip.findOne({ tripRequestId: request._id });

  await service.updateTripStopProgress({
    userId: a,
    body: { tripId: trip._id.toString(), stopSequence: 1, status: TRIP_STOP_STATUS.COMPLETED, podImage: "proof.jpg" },
  });

  const tripStops = await TripStops.findOne({ tripId: trip._id });
  const recipientA = trip.recipients.find((r) => r.userId.equals(a))._id;
  const recipientB = trip.recipients.find((r) => r.userId.equals(b))._id;
  const metaFor = (sequence, recipientId) =>
    tripStops.stops.find((s) => s.sequence === sequence).recipientsMeta.find((m) => m.recipientId.equals(recipientId));
  assert.equal(metaFor(1, recipientA).status, TRIP_STOP_STATUS.COMPLETED);
  assert.deepEqual([...metaFor(1, recipientA).proofPhotos], ["proof.jpg"]);
  assert.equal(metaFor(1, recipientB).status, TRIP_STOP_STATUS.PENDING);

  const refreshed = await Trip.findById(trip._id);
  assert.equal(refreshed.recipients.find((r) => r._id.equals(recipientA)).currentStopIndex, 2);
  assert.equal(refreshed.recipients.find((r) => r._id.equals(recipientB)).currentStopIndex, 1);
});

test("a non-assigned user cannot update stop progress", async () => {
  const driver = id();
  const request = await createBooking({ candidates: [driver] });
  await service.acceptTripRequestForDriver({ userId: driver, tripId: request._id.toString() });
  const trip = await Trip.findOne({ tripRequestId: request._id });
  await assert.rejects(
    service.updateTripStopProgress({
      userId: id(),
      body: { tripId: trip._id.toString(), stopSequence: 1, status: TRIP_STOP_STATUS.ARRIVED },
    }),
    { message: TRIP_ERRORS.TRIP_NOT_FOUND }
  );
});

test("invalid and missing references fail with clear errors", async () => {
  await assert.rejects(service.acceptTripRequestForDriver({ userId: id(), tripId: "bad" }), { message: TRIP_ERRORS.INVALID_TRIP_ID });
  await assert.rejects(service.acceptTripRequestForDriver({ userId: id(), tripId: id().toString() }), { message: TRIP_ERRORS.REQUEST_NOT_FOUND });
  await assert.rejects(service.getTripRequestDetails("bad", id().toString()), { message: TRIP_ERRORS.INVALID_TRIP_ID });
  await assert.rejects(service.getDriverCurrentTripDetails(id().toString()), { message: TRIP_ERRORS.NO_ACTIVE_TRIP });
  await assert.rejects(
    service.updateTripStopProgress({ userId: id(), body: { tripId: id().toString(), stopSequence: 1, status: "NOPE" } }),
    { message: TRIP_ERRORS.INVALID_STOP_STATUS }
  );
});

test("existing read queries keep their response shape", async () => {
  const [driver, customer] = [id(), id()];
  const request = await createBooking({ customer, candidates: [driver] });
  const listed = await service.listTripRequests(driver);
  assert.equal(listed.length, 1);
  assert.ok(listed[0].stops && listed[0].currentRecipient && "status" in listed[0]);
  await service.acceptTripRequestForDriver({ userId: driver, tripId: request._id.toString() });
  assert.equal((await service.listTripRequests(driver)).length, 0);
  const current = await service.getDriverCurrentTripDetails(driver.toString());
  assert.equal(current.trip.length, 1);
  assert.ok(current.tripStop.stops.length > 0);
  const details = await service.getTripRequestDetails(request._id.toString(), driver.toString());
  assert.ok(Array.isArray(details.users));
});

const eventsOf = (type) => kafka.published.filter(({ message }) => message.event === type);

test("every lifecycle step publishes exactly one matching event", async () => {
  const [owner, driverA, driverB] = [id(), id(), id()];
  const request = await createBooking({ candidates: [owner], vehiclesRequired: 1 });
  assert.equal(eventsOf(TRIP_EVENT_TYPES.CREATED).length, 1);

  await service.acceptTripRequestForOwner({
    userId: owner,
    tripId: request._id.toString(),
    body: { recipients: [{ userId: driverA }, { userId: driverB }] },
  });
  assert.equal(eventsOf(TRIP_EVENT_TYPES.ASSIGNED).length, 1);
  assert.equal(eventsOf(TRIP_EVENT_TYPES.ASSIGNED)[0].message.data.recipients.length, 2);

  await service.rejectTripRequestForDriver({ userId: driverB, tripId: request._id.toString() });
  assert.equal(eventsOf(TRIP_EVENT_TYPES.REJECTED).length, 1);

  await service.acceptTripRequestForDriver({ userId: driverA, tripId: request._id.toString() });
  assert.equal(eventsOf(TRIP_EVENT_TYPES.ACCEPTED).length, 1);
  assert.equal(eventsOf(TRIP_EVENT_TYPES.FULFILLED).length, 1);

  const trip = await Trip.findOne({ tripRequestId: request._id });
  await service.updateTripStopProgress({
    userId: driverA,
    body: { tripId: trip._id.toString(), stopSequence: 1, status: TRIP_STOP_STATUS.ARRIVED },
  });
  assert.equal(eventsOf(TRIP_EVENT_TYPES.STOP_UPDATED).length, 1);
});

test("fulfilled is published once, only when the quota is met, and not again on retry", async () => {
  const candidates = [id(), id(), id()];
  const request = await createBooking({ candidates, vehiclesRequired: 2 });
  await service.acceptTripRequestForDriver({ userId: candidates[0], tripId: request._id.toString() });
  assert.equal(eventsOf(TRIP_EVENT_TYPES.FULFILLED).length, 0);
  await service.acceptTripRequestForDriver({ userId: candidates[1], tripId: request._id.toString() });
  assert.equal(eventsOf(TRIP_EVENT_TYPES.FULFILLED).length, 1);
  await service.acceptTripRequestForDriver({ userId: candidates[1], tripId: request._id.toString() });
  assert.equal(eventsOf(TRIP_EVENT_TYPES.FULFILLED).length, 1);
  assert.equal(eventsOf(TRIP_EVENT_TYPES.ACCEPTED).length, 3);
});

test("a failing event publisher never fails or duplicates the operation", async () => {
  const driver = id();
  const request = await createBooking({ candidates: [driver] });
  kafka.failNext(2);
  const result = await service.acceptTripRequestForDriver({ userId: driver, tripId: request._id.toString() });
  assert.equal(result.message, TRIP_RESPONSES.ACCEPTED);
  assert.equal(await Trip.countDocuments({ tripRequestId: request._id }), 1);
});

test("concurrent acceptance of a 2-vehicle booking with 4 candidates yields exactly 2 assignments sharing one trip", async () => {
  const candidates = Array.from({ length: 4 }, id);
  const request = await createBooking({ candidates, vehiclesRequired: 2 });
  const settled = await Promise.allSettled(
    candidates.map((userId) =>
      service.acceptTripRequestForDriver({ userId, tripId: request._id.toString() })
    )
  );
  assert.equal(settled.filter((r) => r.status === "fulfilled").length, 2);

  const trips = await Trip.find({ tripRequestId: request._id });
  assert.equal(trips.length, 1);
  assert.equal(trips[0].recipients.length, 2);

  const stored = await TripRequests.findById(request._id);
  assert.equal(stored.status, TRIP_STATUS.ACCEPTED);
  assert.equal(stored.acceptedCount, 2);
  assert.equal(stored.recipients.filter((r) => r.status === TRIP_STATUS.ACCEPTED).length, 2);
  assert.equal(stored.recipients.filter((r) => r.status === TRIP_STATUS.EXPIRED).length, 2);
  assert.equal(eventsOf(TRIP_EVENT_TYPES.FULFILLED).length, 1);
});

test("trip stops follow the request: one stops document, linked to the trip, one metadata entry per assignment per stop", async () => {
  const candidates = [id(), id(), id()];
  const request = await createBooking({ candidates, vehiclesRequired: 2 });
  await Promise.all([
    service.acceptTripRequestForDriver({ userId: candidates[0], tripId: request._id.toString() }),
    service.acceptTripRequestForDriver({ userId: candidates[1], tripId: request._id.toString() }),
  ]);

  const trip = await Trip.findOne({ tripRequestId: request._id });
  const stopDocs = await TripStops.find({ tripRequestId: request._id });
  assert.equal(stopDocs.length, 1);
  assert.equal(stopDocs[0].tripId.toString(), trip._id.toString());

  const assignmentIds = trip.recipients.map((r) => r._id.toString()).sort();
  for (const stop of stopDocs[0].stops) {
    assert.deepEqual(stop.recipientsMeta.map((m) => m.recipientId.toString()).sort(), assignmentIds);
    assert.ok(stop.recipientsMeta.every((m) => m.status === TRIP_STOP_STATUS.PENDING));
  }

  const rejectedOut = await service.getTripRequestDetails(request._id.toString(), candidates[0].toString());
  assert.equal(rejectedOut.vehiclesRequired, 2);
  assert.equal(rejectedOut.acceptedCount, 2);
});

test("each driver sees only their own stops and trip assignment", async () => {
  const [a, b] = [id(), id()];
  const request = await createBooking({ candidates: [a, b], vehiclesRequired: 2 });
  await service.acceptTripRequestForDriver({ userId: a, tripId: request._id.toString() });
  await service.acceptTripRequestForDriver({ userId: b, tripId: request._id.toString() });

  const trip = await Trip.findOne({ tripRequestId: request._id });
  await service.updateTripStopProgress({
    userId: b,
    body: { tripId: trip._id.toString(), stopSequence: 1, status: TRIP_STOP_STATUS.COMPLETED },
  });

  const currentA = await service.getDriverCurrentTripDetails(a.toString());
  const currentB = await service.getDriverCurrentTripDetails(b.toString());
  assert.equal(currentA.trip[0].users.length, 1);
  assert.equal(currentA.trip[0].users[0].currentStopIndex, 1);
  assert.equal(currentB.trip[0].users[0].currentStopIndex, 2);
  assert.equal(currentA.tripStop.stops[0].recipientsMeta.length, 1);
  assert.equal(currentA.tripStop.stops[0].recipientsMeta[0].status, TRIP_STOP_STATUS.PENDING);
  assert.equal(currentB.tripStop.stops[0].recipientsMeta[0].status, TRIP_STOP_STATUS.COMPLETED);
});

test("owner-created multi-vehicle work: each assigned driver confirms independently", async () => {
  const [d1, d2] = [id(), id()];
  const request = await createBooking({ candidates: [d1, d2], vehiclesRequired: 2, requestType: "OWNER" });
  assert.equal(request.status, TRIP_STATUS.WAITING_FOR_DRIVER);
  await service.acceptTripRequestForDriver({ userId: d1, tripId: request._id.toString() });
  assert.equal((await TripRequests.findById(request._id)).status, TRIP_STATUS.WAITING_FOR_DRIVER);
  await service.acceptTripRequestForDriver({ userId: d2, tripId: request._id.toString() });
  assert.equal((await TripRequests.findById(request._id)).status, TRIP_STATUS.ACCEPTED);
  assert.equal((await Trip.findOne({ tripRequestId: request._id })).recipients.length, 2);
});

test("a rejection after one acceptance closes a multi-vehicle request as ACCEPTED, never stuck open", async () => {
  const [a, b] = [id(), id()];
  const request = await createBooking({ candidates: [a, b], vehiclesRequired: 2 });
  await service.acceptTripRequestForDriver({ userId: a, tripId: request._id.toString() });
  await service.rejectTripRequestForDriver({ userId: b, tripId: request._id.toString() });
  const stored = await TripRequests.findById(request._id);
  assert.equal(stored.status, TRIP_STATUS.ACCEPTED);
  assert.equal(stored.acceptedCount, 1);
});
