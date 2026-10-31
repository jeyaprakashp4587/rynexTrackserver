import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const base = "./harness/src/modules/trip";
const id = () => new mongoose.Types.ObjectId();

const constants = await import(`${base}/constants/shared/trip.constants.js`);
const { COMPANY_ERRORS, COMPANY_RESPONSES, COMPANY_FAILURES } = await import(`${base}/constants/company/company.messages.js`);
const parsers = await import(`${base}/utils/company/companyRun.parsers.js`);
const builders = await import(`${base}/utils/company/companyRun.builders.js`);
const route = await import(`${base}/utils/company/companyRoute.js`);
const { toRunConflictError, isActiveRunConflict } = await import(`${base}/utils/company/companyRun.errors.js`);
const { trip: Trip } = await import(`${base}/models/generic/trip.model.js`);
const { companyRun: Run } = await import(`${base}/models/company/companyRun.model.js`);
const { default: TripStops } = await import(`${base}/models/generic/tripStops.model.js`);
const { companyRoutes } = await import(`${base}/models/company/companyRoute.model.js`);
const events = await import(`${base}/events/trip.events.js`);
const companyEvents = await import(`${base}/events/company.events.js`);
const publisher = await import(`${base}/events/trip.publisher.js`);
const location = await import(`${base}/utils/shared/clearLocation.js`);
const kafka = await import("./harness/src/kafka/index.js");
const redisStub = await import("./harness/src/config/redis.config.js");
const { TRIP_STATUS } = constants;

const standing = (overrides = {}) => ({
  userId: id(),
  driverId: id(),
  driverUserId: id(),
  vehicleId: id(),
  assignedBy: id(),
  status: TRIP_STATUS.PENDING,
  ...overrides,
});

test("parseStartRun validates route, vehicle and runId", () => {
  const routeId = id().toString();
  const vehicleId = id().toString();
  const parsed = parsers.parseStartRun({ params: { routeId }, body: { vehicleId, runId: " run-1_A " } });
  assert.equal(parsed.runId, "run-1_A");
  assert.ok(parsed.routeId instanceof mongoose.Types.ObjectId);
  assert.equal(parsers.parseStartRun({ params: { routeId }, body: { vehicleId } }).runId, undefined);
  assert.throws(() => parsers.parseStartRun({ params: { routeId: "x" }, body: { vehicleId } }), { message: COMPANY_ERRORS.INVALID_ROUTE_ID });
  assert.throws(() => parsers.parseStartRun({ params: { routeId }, body: { vehicleId: "x" } }), { message: "Invalid vehicleId" });
  assert.throws(() => parsers.parseStartRun({ params: { routeId }, body: { vehicleId, runId: "bad id!" } }), { message: COMPANY_ERRORS.INVALID_RUN_ID });
  assert.throws(() => parsers.parseStartRun({ params: { routeId }, body: { vehicleId, runId: "a".repeat(65) } }), { message: COMPANY_ERRORS.INVALID_RUN_ID });
  assert.throws(() => parsers.parseStartRun({ params: { routeId }, body: { vehicleId, runId: 5 } }), { message: COMPANY_ERRORS.INVALID_RUN_ID });
});

test("parseEndRun trims and bounds the reason", () => {
  assert.equal(parsers.parseEndRun({ reason: "  breakdown " }).reason, "breakdown");
  assert.equal(parsers.parseEndRun({}).reason, undefined);
  assert.equal(parsers.parseEndRun({ reason: "   " }).reason, undefined);
  assert.throws(() => parsers.parseEndRun({ reason: "x".repeat(201) }), { message: COMPANY_ERRORS.INVALID_END_REASON });
  assert.throws(() => parsers.parseEndRun({ reason: 4 }), { message: COMPANY_ERRORS.INVALID_END_REASON });
});

test("parseHandover requires a valid target driver user", () => {
  const driverUserId = id().toString();
  const parsed = parsers.parseHandover({ driverUserId, driverId: id().toString() });
  assert.ok(parsed.driverUserId instanceof mongoose.Types.ObjectId);
  assert.ok(parsed.driverId instanceof mongoose.Types.ObjectId);
  assert.equal(parsers.parseHandover({ driverUserId }).driverId, undefined);
  assert.throws(() => parsers.parseHandover({}), { message: COMPANY_ERRORS.INVALID_HANDOVER_TARGET });
  assert.throws(() => parsers.parseHandover({ driverUserId, driverId: "x" }), { message: "Invalid driverId" });
});

test("parseExtraStops validates count, type and coordinates", () => {
  const stop = { locationName: "X", stopType: "DROP", coords: { lat: 1, lon: 2 } };
  const [formatted] = parsers.parseExtraStops({ stops: [stop] });
  assert.deepEqual(formatted.coords.coordinates, [2, 1]);
  assert.throws(() => parsers.parseExtraStops({ stops: [] }), { message: COMPANY_ERRORS.EXTRA_STOPS_REQUIRED });
  assert.throws(() => parsers.parseExtraStops({}), { message: COMPANY_ERRORS.EXTRA_STOPS_REQUIRED });
  assert.throws(() => parsers.parseExtraStops({ stops: Array(21).fill(stop) }), { message: COMPANY_ERRORS.EXTRA_STOPS_LIMIT });
  assert.throws(() => parsers.parseExtraStops({ stops: [{ ...stop, stopType: "WAIT" }] }), { message: COMPANY_ERRORS.INVALID_STOP_TYPE });
  assert.throws(() => parsers.parseExtraStops({ stops: [{ ...stop, coords: { lat: "a", lon: 1 } }] }), { message: "Invalid stop coordinates" });
});

test("findStandingAssignment prefers driverUserId, falls back to userId, skips inactive", () => {
  const driver = id();
  const vehicle = id();
  const viaDriverUser = standing({ driverUserId: driver, vehicleId: vehicle });
  const viaUserOnly = standing({ driverUserId: undefined, userId: driver, vehicleId: id() });
  const ownerListed = standing({ userId: driver, driverUserId: id() });
  const rejected = standing({ driverUserId: driver, vehicleId: id(), status: TRIP_STATUS.REJECTED });
  const list = [ownerListed, rejected, viaDriverUser, viaUserOnly];
  assert.equal(route.findStandingAssignment(list, driver, vehicle), viaDriverUser);
  assert.equal(route.findStandingAssignment(list, driver.toString(), viaUserOnly.vehicleId), viaUserOnly);
  assert.equal(route.findStandingAssignment(list, driver, rejected.vehicleId), undefined);
  assert.equal(route.findStandingAssignment(list, id(), vehicle), undefined);
  assert.equal(route.findStandingAssignment(undefined, driver), undefined);
});

test("active assignment, ownership and handover helpers", () => {
  const owner = id();
  const driver = id();
  const first = { _id: id(), userId: driver, status: TRIP_STATUS.CANCELLED, assignedBy: owner };
  const second = { _id: id(), userId: id(), status: TRIP_STATUS.ACCEPTED, assignedBy: owner };
  const tripDoc = { createdBy: owner, activeDriverUserId: second.userId, recipients: [first, second] };
  assert.equal(route.findActiveAssignment(tripDoc), second);
  assert.equal(route.findActiveAssignment({ ...tripDoc, activeDriverUserId: id() }), undefined);
  assert.ok(route.isTripOwner(tripDoc, owner));
  assert.ok(!route.isTripOwner(tripDoc, driver));
  assert.ok(route.hasAssignment(tripDoc, driver));
  assert.ok(!route.hasAssignment(tripDoc, id()));
  assert.ok(route.wasHandedOverTo(tripDoc, second));
  assert.ok(!route.wasHandedOverTo(tripDoc, first));
});

test("run builders produce a started run with the driver's accepted assignment", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const s = standing();
  const assignment = builders.buildRunAssignment({ standing: s, now });
  assert.equal(assignment.status, TRIP_STATUS.ACCEPTED);
  assert.equal(assignment.userId, s.driverUserId);
  assert.equal(assignment.currentStopIndex, 1);
  assert.equal(assignment.acceptedAt, now);
  const fallback = builders.buildRunAssignment({ standing: standing({ driverUserId: undefined }), now });
  assert.ok(fallback.userId);

  const routeDoc = { _id: id(), createdBy: id(), tripStopMode: "MULTI_STOP" };
  const runTrip = builders.buildRunTrip({ route: routeDoc, assignment, runId: "r1", now });
  assert.equal(runTrip.companyRouteId, routeDoc._id);
  assert.equal(runTrip.tripRequestId, undefined);
  assert.equal(runTrip.status, TRIP_STATUS.ACCEPTED);
  assert.equal(runTrip.isTripEnded, false);
  assert.equal(runTrip.activeDriverUserId, assignment.userId);
  assert.equal(runTrip.activeVehicleId, assignment.vehicleId);
  assert.equal(runTrip.recipients[0], assignment);
  assert.equal(runTrip.startedAt, now);
});

test("buildRunStops snapshots template stops with one fresh meta for the assignment", () => {
  const recipientId = id();
  const template = [
    { _id: id(), sequence: 2, stopType: "DROP", locationName: "B", coords: { type: "Point", coordinates: [2, 2] }, recipientsMeta: [{ recipientId: id(), contactPerson: "Meta", contactPhone: "99", notes: "n", otp: "1234", proofPhotos: ["x"], status: "COMPLETED" }] },
    { _id: id(), sequence: 1, stopType: "PICKUP", locationName: "A", contactPerson: "Stop", coords: { type: "Point", coordinates: [1, 1] }, recipientsMeta: [] },
  ];
  const stops = builders.buildRunStops(template, recipientId);
  assert.deepEqual(stops.map((s) => s.sequence), [1, 2]);
  assert.equal(stops[0]._id, undefined);
  assert.equal(stops[0].contactPerson, "Stop");
  assert.equal(stops[1].contactPerson, "Meta");
  assert.equal(stops[1].recipientsMeta.length, 1);
  assert.equal(stops[1].recipientsMeta[0].recipientId, recipientId);
  assert.equal(stops[1].recipientsMeta[0].status, constants.TRIP_STOP_STATUS.PENDING);
  assert.equal(stops[1].recipientsMeta[0].otp, undefined);
  assert.equal(stops[1].recipientsMeta[0].proofPhotos, undefined);
  assert.equal(stops[1].recipientsMeta[0].notes, "n");
  assert.equal(template[0].sequence, 2);
});

test("extra stops, handover assignment and progress helpers", () => {
  const extra = builders.buildExtraStops([{ locationName: "X", sequence: 1 }, { locationName: "Y", sequence: 2 }], 7);
  assert.deepEqual(extra.map((s) => s.sequence), [7, 8]);
  assert.deepEqual(extra[0].recipientsMeta, []);
  assert.equal(builders.nextStopSequence([{ sequence: 1 }, { sequence: 3 }]), 4);
  assert.equal(builders.nextStopSequence([]), 1);
  const previous = { vehicleId: id(), assignedBy: id(), currentStopIndex: 3 };
  const target = id();
  const handover = builders.buildHandoverAssignment({ previous, driverUserId: target, driverId: undefined });
  assert.equal(handover.userId, target);
  assert.equal(handover.vehicleId, previous.vehicleId);
  assert.equal(handover.assignedBy, previous.assignedBy);
  assert.equal(handover.currentStopIndex, 3);
  assert.equal(handover.status, TRIP_STATUS.ACCEPTED);
  assert.ok(builders.hasFinishedAllStops({ currentStopIndex: 4 }, 3));
  assert.ok(!builders.hasFinishedAllStops({ currentStopIndex: 3 }, 3));
  assert.ok(builders.hasFinishedAllStops({ currentStopIndex: 1 }, 0));
});

test("duplicate key errors map to specific conflict messages", () => {
  const dup = (keyPattern) => Object.assign(new Error("E11000"), { code: 11000, keyPattern });
  assert.equal(toRunConflictError(dup({ activeDriverUserId: 1 })).message, COMPANY_ERRORS.DRIVER_HAS_OPEN_TRIP);
  assert.equal(toRunConflictError(dup({ activeVehicleId: 1 })).message, COMPANY_ERRORS.VEHICLE_IN_USE);
  assert.equal(toRunConflictError(dup({ other: 1 })).message, COMPANY_ERRORS.RUN_CONFLICT);
  const plain = new Error("boom");
  assert.equal(toRunConflictError(plain), plain);
});

test("company run schema enforces open-run uniqueness and idempotency via partial indexes", () => {
  const indexes = Run.schema.indexes();
  const find = (key) => indexes.find(([fields]) => Object.keys(fields).join() === key);
  const driverIndex = find("activeDriverUserId");
  const vehicleIndex = find("activeVehicleId");
  const runIndex = find("companyRouteId,runId");
  for (const index of [driverIndex, vehicleIndex, runIndex]) {
    assert.ok(index);
    assert.equal(index[1].unique, true);
  }
  assert.equal(driverIndex[1].partialFilterExpression.isTripEnded, false);
  assert.equal(vehicleIndex[1].partialFilterExpression.isTripEnded, false);
  assert.deepEqual(runIndex[1].partialFilterExpression, { runId: { $type: "string" } });
  assert.equal(Run.schema.path("runId").instance, "String");
  assert.equal(Run.schema.path("activeDriverUserId").instance, "ObjectId");
  assert.equal(Run.schema.path("activeVehicleId").instance, "ObjectId");
});

test("generic trip and trip stops schemas carry no company fields", () => {
  for (const field of ["companyRouteId", "runId", "activeDriverUserId", "activeVehicleId"]) {
    assert.equal(Trip.schema.path(field), undefined, field);
  }
  assert.equal(TripStops.schema.path("companyTripId"), undefined);
});

test("tripStops has a unique partial tripId index and company routes are typed", () => {
  const stopIndex = TripStops.schema.indexes().find(([fields]) => Object.keys(fields).join() === "tripId");
  assert.equal(stopIndex[1].unique, true);
  assert.deepEqual(stopIndex[1].partialFilterExpression, { tripId: { $type: "objectId" } });
  const standingSchema = companyRoutes.schema.path("recipients").schema;
  for (const field of ["userId", "driverId", "driverUserId", "vehicleId", "assignedBy"]) {
    assert.equal(standingSchema.path(field).instance, "ObjectId", field);
  }
  assert.equal(standingSchema.path("assignedAt").instance, "Date");
});

test("company messages are non-empty and error messages are unique", () => {
  for (const group of [COMPANY_ERRORS, COMPANY_RESPONSES, COMPANY_FAILURES]) {
    assert.ok(Object.values(group).every((value) => typeof value === "string" && value.length > 0));
  }
  const errors = Object.values(COMPANY_ERRORS);
  assert.equal(new Set(errors).size, errors.length);
});

test("run events keep the envelope and expose the documented payloads", () => {
  const T = constants.TRIP_EVENT_TYPES;
  assert.equal(events.buildTripStarted({}).event, T.STARTED);
  assert.equal(events.buildTripHandover({}).event, T.HANDOVER);
  assert.equal(events.buildTripStopsAdded({}).event, T.STOPS_ADDED);
  assert.equal(events.buildTripEnded({}).event, T.ENDED);
  const startedAt = new Date("2026-01-01T00:00:00Z");
  const assignment = { _id: id(), userId: id(), driverId: id(), vehicleId: id() };
  const tripDoc = { _id: id(), companyRouteId: id(), startedAt, activeDriverUserId: assignment.userId, activeVehicleId: assignment.vehicleId, status: "COMPLETED", completedAt: startedAt };
  assert.equal(companyEvents.buildRunStartedData({ trip: tripDoc, assignment }).startedAt, startedAt.toISOString());
  assert.equal(companyEvents.buildRunEndedData({ trip: tripDoc, reason: "r" }).reason, "r");
  const handover = companyEvents.buildRunHandoverData({ trip: tripDoc, previous: { userId: id() }, assignment: { ...assignment, currentStopIndex: 2 }, actorId: id() });
  assert.equal(handover.currentStopIndex, 2);
  const added = companyEvents.buildRunStopsAddedData({ trip: tripDoc, stops: [{ sequence: 4, locationName: "Z", stopType: "DROP", coords: {} }], actorId: id() });
  assert.deepEqual(added.stops, [{ sequence: 4, locationName: "Z", stopType: "DROP" }]);
});

test("run publishers send to the trip topic and swallow broker failures", async () => {
  kafka.published.length = 0;
  await publisher.publishTripStarted({ a: 1 });
  await publisher.publishTripHandover({ a: 1 });
  await publisher.publishTripStopsAdded({ a: 1 });
  await publisher.publishTripEnded({ a: 1 });
  assert.deepEqual(kafka.published.map(({ message }) => message.event), [
    constants.TRIP_EVENT_TYPES.STARTED,
    constants.TRIP_EVENT_TYPES.HANDOVER,
    constants.TRIP_EVENT_TYPES.STOPS_ADDED,
    constants.TRIP_EVENT_TYPES.ENDED,
  ]);
  kafka.failNext(1);
  await assert.doesNotReject(publisher.publishTripEnded({ a: 1 }));
  kafka.failNext(0);
});

test("location cleanup deletes trip and driver keys and never throws", async () => {
  redisStub.deletedKeys.length = 0;
  const tripId = id();
  const driver = id();
  await location.clearTripLocation({ tripId, driverUserId: driver });
  assert.deepEqual(redisStub.deletedKeys, [`trip_data:${tripId}`, `driver_location:${driver}`, `driver_heartbeat:${driver}`]);
  redisStub.deletedKeys.length = 0;
  await location.clearDriverLocation(driver);
  assert.deepEqual(redisStub.deletedKeys, [`driver_location:${driver}`, `driver_heartbeat:${driver}`]);
  redisStub.failRedis(true);
  await assert.doesNotReject(location.clearDriverLocation(driver));
  redisStub.failRedis(false);
});

test("router registers driver routes before the :tripId catch-all and exposes the run endpoints", async () => {
  const { default: router } = await import(`${base}/trip.route.js`);
  const flatten = (stack) => stack.flatMap((layer) => layer.route ? [layer] : layer.handle?.stack ? flatten(layer.handle.stack) : []);
  const layers = flatten(router.stack).map((layer) => ({
    path: layer.route.path,
    methods: Object.keys(layer.route.methods),
  }));
  const index = (path, method) => layers.findIndex((l) => l.path === path && l.methods.includes(method));
  assert.ok(index("/company/driver/routes", "get") >= 0);
  assert.ok(index("/company/driver/routes", "get") < index("/company/:tripId", "get"));
  for (const path of ["/company/routes/:routeId/runs", "/company/trips/:tripId/end", "/company/trips/:tripId/handover", "/company/trips/:tripId/stops", "/company/trips/:tripId/stop-progress"]) {
    assert.ok(index(path, "post") >= 0, path);
  }
  assert.ok(index("/requests/:tripId/accept-driver", "post") >= 0);
  assert.ok(index("/company/routes", "post") >= 0);
});

test("hasHandedOver and active-run conflict detection", () => {
  const driver = id();
  const tripDoc = { recipients: [{ userId: driver, cancelReason: "DRIVER_HANDOVER" }, { userId: id() }] };
  assert.ok(route.hasHandedOver(tripDoc, driver));
  assert.ok(!route.hasHandedOver(tripDoc, id()));
  assert.ok(!route.hasHandedOver({}, driver));
  const dup = (keyPattern) => Object.assign(new Error("E11000"), { code: 11000, keyPattern });
  assert.ok(isActiveRunConflict(dup({ activeDriverUserId: 1 })));
  assert.ok(isActiveRunConflict(dup({ activeVehicleId: 1 })));
  assert.ok(!isActiveRunConflict(dup({ runId: 1 })));
  assert.ok(!isActiveRunConflict(new Error("x")));
});
