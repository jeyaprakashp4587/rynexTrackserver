import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const base = "./harness/src/modules/trip";
const { DB1 } = await import("./harness/src/config/db.js");
const kafka = await import("./harness/src/kafka/index.js");
const redisStub = await import("./harness/src/config/redis.config.js");
const tripService = await import(`${base}/services/trip.services.js`);
const runService = await import(`${base}/services/company.run.services.js`);
const { default: TripRequests } = await import(`${base}/models/tripRequests.model.js`);
const { trip: Trip } = await import(`${base}/models/trip.model.js`);
const { default: TripStops } = await import(`${base}/models/tripStops.model.js`);
const { companyRoutes } = await import(`${base}/models/company.tripRoute.models.js`);
const { TRIP_EVENT_TYPES: E, TRIP_STATUS: S, TRIP_STOP_STATUS } = await import(`${base}/constants/trip.constants.js`);
const { COMPANY_ERRORS } = await import(`${base}/constants/company.messages.js`);

let replSet;
const id = () => new mongoose.Types.ObjectId();

const stop = (name, type, lat, lon) => ({ locationName: name, stopType: type, coords: { lat, lon } });
const STOPS = [stop("Depot", "PICKUP", 12.9, 80.2), stop("Terminus", "DROP", 13.0, 80.3)];

const eventsOf = (type) => kafka.published.filter(({ message }) => message.event === type);

const createRoute = async ({ owner = id(), drivers, stops = STOPS }) => {
  const route = await tripService.createCompanyTrip({
    userId: owner,
    body: {
      data: {
        isDailyTrip: true,
        stops,
        recipients: drivers.map(({ userId, vehicleId }) => ({ userId, driverUserId: userId, driverId: id(), vehicleId })),
      },
    },
  });
  return { owner, routeId: route._id };
};

const start = (userId, routeId, vehicleId, runId) =>
  runService.startRun({ userId, params: { routeId: routeId.toString() }, body: { vehicleId: vehicleId.toString(), runId } });

const progress = (userId, tripId, stopSequence, status = TRIP_STOP_STATUS.COMPLETED) =>
  runService.updateStopProgress({ userId, tripId: tripId.toString(), body: { stopSequence, status } });

const end = (userId, tripId, reason) => runService.endRun({ userId, tripId: tripId.toString(), body: { reason } });
const handover = (userId, tripId, driverUserId, driverId) =>
  runService.handoverRun({ userId, tripId: tripId.toString(), body: { driverUserId: driverUserId.toString(), driverId: driverId?.toString() } });
const addStops = (userId, tripId, stops) => runService.addExtraStops({ userId, tripId: tripId.toString(), body: { stops } });

const setup = async (extra = {}) => {
  const [d1, d2] = [id(), id()];
  const [v1, v2] = [id(), id()];
  const { owner, routeId } = await createRoute({
    drivers: [{ userId: d1, vehicleId: v1 }, { userId: d2, vehicleId: v2 }],
    ...extra,
  });
  return { owner, routeId, d1, d2, v1, v2 };
};

const stopsOf = async (tripId) => (await TripStops.findOne({ tripId })).stops;

before(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await DB1.openUri(replSet.getUri());
  await Promise.all([TripRequests.init(), Trip.init(), TripStops.init(), companyRoutes.init()]);
});

after(async () => {
  await DB1.close();
  await replSet.stop();
});

beforeEach(async () => {
  await Promise.all([TripRequests.deleteMany({}), Trip.deleteMany({}), TripStops.deleteMany({}), companyRoutes.deleteMany({})]);
  kafka.published.length = 0;
  kafka.failNext(0);
  redisStub.deletedKeys.length = 0;
  redisStub.failRedis(false);
});

test("driver sees only their own routes and vehicles, with the open trip once running", async () => {
  const { routeId, d1, d2, v1 } = await setup();
  const mine = await runService.listDriverRoutes(d1);
  assert.equal(mine.length, 1);
  assert.equal(mine[0].routeId.toString(), routeId.toString());
  assert.equal(mine[0].vehicleId.toString(), v1.toString());
  assert.deepEqual(mine[0].stops.map((s) => s.sequence), [1, 2]);
  assert.equal(mine[0].openTrip, undefined);
  assert.equal((await runService.listDriverRoutes(id())).length, 0);
  assert.equal((await runService.listDriverRoutes(d2)).length, 1);

  const { trip } = await start(d1, routeId, v1);
  const after = await runService.listDriverRoutes(d1);
  assert.equal(after[0].openTrip._id.toString(), trip.tripId.toString());
});

test("starting a run creates a trip with the driver's accepted assignment and a stop snapshot, without any TripRequests", async () => {
  const { owner, routeId, d1, v1 } = await setup();
  const { message, trip: result } = await start(d1, routeId, v1, "run-1");
  assert.equal(message, "Trip started successfully");

  const stored = await Trip.findById(result.tripId);
  assert.equal(stored.companyRouteId.toString(), routeId.toString());
  assert.equal(stored.tripRequestId, undefined);
  assert.equal(stored.status, S.ACCEPTED);
  assert.equal(stored.isTripEnded, false);
  assert.ok(stored.startedAt);
  assert.equal(stored.createdBy.toString(), owner.toString());
  assert.equal(stored.activeDriverUserId.toString(), d1.toString());
  assert.equal(stored.activeVehicleId.toString(), v1.toString());
  assert.equal(stored.recipients.length, 1);
  assert.equal(stored.recipients[0].status, S.ACCEPTED);
  assert.equal(stored.recipients[0].userId.toString(), d1.toString());
  assert.equal(stored.recipients[0].assignedBy.toString(), owner.toString());
  assert.equal(stored.recipients[0].currentStopIndex, 1);
  assert.equal(result.recipientId.toString(), stored.recipients[0]._id.toString());

  assert.equal(await TripRequests.countDocuments({}), 0);
  const stops = await stopsOf(stored._id);
  assert.equal(stops.length, 2);
  for (const s of stops) {
    assert.equal(s.recipientsMeta.length, 1);
    assert.equal(s.recipientsMeta[0].recipientId.toString(), stored.recipients[0]._id.toString());
    assert.equal(s.recipientsMeta[0].status, TRIP_STOP_STATUS.PENDING);
  }
  const template = await TripStops.findOne({ companyTripId: routeId });
  assert.equal(template.tripId, null);
  assert.equal(template.stops.length, 2);
  assert.equal(eventsOf(E.STARTED).length, 1);
});

test("retrying a start with the same run id returns the same trip and creates nothing twice", async () => {
  const { routeId, d1, d2, v1, v2 } = await setup();
  const first = await start(d1, routeId, v1, "run-1");
  const second = await start(d1, routeId, v1, "run-1");
  assert.equal(first.trip.tripId.toString(), second.trip.tripId.toString());
  assert.equal(await Trip.countDocuments({ companyRouteId: routeId }), 1);
  assert.equal(await TripStops.countDocuments({ tripId: first.trip.tripId }), 1);
  assert.equal(eventsOf(E.STARTED).length, 1);
  await assert.rejects(start(d2, routeId, v2, "run-1"), { message: COMPANY_ERRORS.RUN_ID_TAKEN });
});

test("a retry heals a start that crashed after creating the trip but before the stops", async () => {
  const { routeId, d1, v1 } = await setup();
  const { trip } = await start(d1, routeId, v1, "run-1");
  await TripStops.deleteOne({ tripId: trip.tripId });
  const retry = await start(d1, routeId, v1, "run-1");
  assert.equal(retry.trip.tripId.toString(), trip.tripId.toString());
  assert.equal((await stopsOf(trip.tripId)).length, 2);
  assert.equal(await Trip.countDocuments({}), 1);
});

test("starting is refused for unassigned drivers, wrong vehicles, bad ids and unusable routes", async () => {
  const { routeId, d1, d2, v1, v2 } = await setup();
  await assert.rejects(start(id(), routeId, v1), { message: COMPANY_ERRORS.NOT_ASSIGNED_TO_ROUTE });
  await assert.rejects(start(d1, routeId, v2), { message: COMPANY_ERRORS.NOT_ASSIGNED_TO_ROUTE });
  await assert.rejects(start(d1, routeId, id()), { message: COMPANY_ERRORS.NOT_ASSIGNED_TO_ROUTE });
  await assert.rejects(start(d1, id(), v1), { message: COMPANY_ERRORS.ROUTE_NOT_FOUND });
  await assert.rejects(runService.startRun({ userId: d1, params: { routeId: "bad" }, body: { vehicleId: v1.toString() } }), { message: COMPANY_ERRORS.INVALID_ROUTE_ID });
  await assert.rejects(runService.startRun({ userId: "bad", params: { routeId: routeId.toString() }, body: { vehicleId: v1.toString() } }), { message: "Invalid user id" });
  await companyRoutes.updateOne({ _id: routeId }, { $set: { status: S.CANCELLED } });
  await assert.rejects(start(d2, routeId, v2), { message: COMPANY_ERRORS.ROUTE_INACTIVE });
  await companyRoutes.updateOne({ _id: routeId }, { $set: { status: S.WAITING_FOR_DRIVER } });
  await TripStops.deleteMany({ companyTripId: routeId });
  await assert.rejects(start(d1, routeId, v1), { message: COMPANY_ERRORS.ROUTE_STOPS_MISSING });
  assert.equal(await Trip.countDocuments({}), 0);
});

test("one running trip per driver and per vehicle, enforced under concurrency", async () => {
  const { routeId, d1, v1 } = await setup();
  const sameDriver = await Promise.allSettled([start(d1, routeId, v1, "a"), start(d1, routeId, v1, "b")]);
  assert.equal(sameDriver.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(sameDriver.find((r) => r.status === "rejected").reason.message, COMPANY_ERRORS.DRIVER_HAS_OPEN_TRIP);
  assert.equal(await Trip.countDocuments({}), 1);

  await Trip.deleteMany({});
  const sharedVehicle = id();
  const [da, db] = [id(), id()];
  const shared = await createRoute({ drivers: [{ userId: da, vehicleId: sharedVehicle }, { userId: db, vehicleId: sharedVehicle }] });
  const race = await Promise.allSettled([start(da, shared.routeId, sharedVehicle), start(db, shared.routeId, sharedVehicle)]);
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(race.find((r) => r.status === "rejected").reason.message, COMPANY_ERRORS.VEHICLE_IN_USE);

  const other = await createRoute({ drivers: [{ userId: d1, vehicleId: id() }] });
  const otherVehicle = (await companyRoutes.findById(other.routeId)).recipients[0].vehicleId;
  await Trip.deleteMany({});
  await start(d1, routeId, v1);
  await assert.rejects(start(d1, other.routeId, otherVehicle), { message: COMPANY_ERRORS.DRIVER_HAS_OPEN_TRIP });
});

test("driver works the stops, canEnd turns true on the last one, ending completes the trip and frees the driver", async () => {
  const { routeId, d1, v1 } = await setup();
  const { trip } = await start(d1, routeId, v1);
  assert.equal((await progress(d1, trip.tripId, 1)).trip.canEnd, false);
  assert.equal((await progress(d1, trip.tripId, 2)).trip.canEnd, true);
  assert.equal((await Trip.findById(trip.tripId)).recipients[0].currentStopIndex, 3);

  const ended = await end(d1, trip.tripId);
  assert.equal(ended.trip.status, S.COMPLETED);
  assert.equal(ended.trip.isTripEnded, true);
  const stored = await Trip.findById(trip.tripId);
  assert.equal(stored.status, S.COMPLETED);
  assert.equal(stored.recipients[0].status, S.COMPLETED);
  assert.ok(stored.recipients[0].completedAt);
  assert.ok(stored.completedAt);
  assert.equal(eventsOf(E.ENDED).length, 1);
  assert.ok(redisStub.deletedKeys.includes(`trip_data:${trip.tripId}`));
  assert.ok(redisStub.deletedKeys.includes(`driver_location:${d1}`));

  const next = await start(d1, routeId, v1);
  assert.notEqual(next.trip.tripId.toString(), trip.tripId.toString());
  assert.equal(await Trip.countDocuments({ companyRouteId: routeId }), 2);
});

test("ending early needs a reason and records a cancelled run; ending twice is harmless", async () => {
  const { routeId, d1, d2, v1 } = await setup();
  const { trip } = await start(d1, routeId, v1);
  await progress(d1, trip.tripId, 1);
  await assert.rejects(end(d1, trip.tripId), { message: COMPANY_ERRORS.END_REASON_REQUIRED });
  await assert.rejects(end(d2, trip.tripId, "x"), { message: COMPANY_ERRORS.RUN_TRIP_NOT_FOUND });
  const ended = await end(d1, trip.tripId, "$bus breakdown");
  assert.equal(ended.trip.status, S.CANCELLED);
  const stored = await Trip.findById(trip.tripId);
  assert.equal(stored.recipients[0].status, S.CANCELLED);
  assert.equal(stored.recipients[0].cancelReason, "$bus breakdown");
  assert.equal(stored.isTripEnded, true);
  const again = await end(d1, trip.tripId, "$bus breakdown");
  assert.equal(again.trip.status, S.CANCELLED);
  assert.equal(eventsOf(E.ENDED).length, 1);
  await assert.rejects(progress(d1, trip.tripId, 2), { message: "Trip not found" });
});

test("a driver can hand the run to another route driver mid-trip and only the new driver continues from the same stop", async () => {
  const { owner, routeId, d1, d2, v1 } = await setup();
  const { trip } = await start(d1, routeId, v1);
  await progress(d1, trip.tripId, 1);

  const result = await handover(d1, trip.tripId, d2);
  assert.equal(result.message, "Trip handed over successfully");
  const stored = await Trip.findById(trip.tripId);
  assert.equal(stored.activeDriverUserId.toString(), d2.toString());
  assert.equal(stored.activeVehicleId.toString(), v1.toString());
  assert.equal(stored.recipients.length, 2);
  assert.equal(stored.recipients[0].status, S.CANCELLED);
  assert.equal(stored.recipients[0].cancelReason, "DRIVER_HANDOVER");
  const next = stored.recipients[1];
  assert.equal(next.userId.toString(), d2.toString());
  assert.equal(next.status, S.ACCEPTED);
  assert.equal(next.currentStopIndex, 2);
  assert.equal(next.vehicleId.toString(), v1.toString());
  assert.equal(next.assignedBy.toString(), owner.toString());

  const stops = await stopsOf(trip.tripId);
  assert.equal(stops[0].recipientsMeta.length, 1);
  assert.equal(stops[1].recipientsMeta.length, 2);

  await assert.rejects(progress(d1, trip.tripId, 2), { message: "Trip not found" });
  await assert.rejects(end(d1, trip.tripId, "x"), { message: COMPANY_ERRORS.NOT_ACTIVE_DRIVER });
  const current = await tripService.getDriverCurrentTripDetails(d2.toString());
  assert.deepEqual(current.tripStop.stops.map((s) => s.sequence), [2]);
  assert.equal((await progress(d2, trip.tripId, 2)).trip.canEnd, true);
  assert.equal(eventsOf(E.HANDOVER).length, 1);
  assert.ok(redisStub.deletedKeys.includes(`driver_location:${d1}`));
  await assert.rejects(start(d1, routeId, v1), { message: COMPANY_ERRORS.VEHICLE_IN_USE });
  assert.equal((await Trip.countDocuments({ activeDriverUserId: d1 })), 0);
});

test("handover retries are idempotent and invalid handovers are refused without changing the trip", async () => {
  const { routeId, d1, d2, v1, v2 } = await setup();
  const { trip } = await start(d1, routeId, v1);
  await assert.rejects(handover(d1, trip.tripId, d1), { message: COMPANY_ERRORS.HANDOVER_SAME_DRIVER });
  await assert.rejects(handover(id(), trip.tripId, d2), { message: COMPANY_ERRORS.HANDOVER_NOT_ALLOWED });
  await assert.rejects(handover(d1, trip.tripId, id()), { message: COMPANY_ERRORS.HANDOVER_TARGET_NOT_ON_ROUTE });
  await assert.rejects(handover(d1, id(), d2), { message: COMPANY_ERRORS.RUN_TRIP_NOT_FOUND });
  assert.equal((await Trip.findById(trip.tripId)).recipients.length, 1);

  await start(d2, routeId, v2);
  await assert.rejects(handover(d1, trip.tripId, d2), { message: COMPANY_ERRORS.DRIVER_HAS_OPEN_TRIP });
  const unchanged = await Trip.findById(trip.tripId);
  assert.equal(unchanged.recipients.length, 1);
  assert.equal(unchanged.activeDriverUserId.toString(), d1.toString());

  await Trip.deleteOne({ activeDriverUserId: d2 });
  await handover(d1, trip.tripId, d2);
  const retry = await handover(d1, trip.tripId, d2);
  assert.equal(retry.message, "Trip handed over successfully");
  assert.equal((await Trip.findById(trip.tripId)).recipients.length, 2);
  await assert.rejects(handover(id(), trip.tripId, d2), { message: COMPANY_ERRORS.HANDOVER_NOT_ALLOWED });
});

test("the owner can hand a run to any driver, including one who is not on the route", async () => {
  const { owner, routeId, d1, v1 } = await setup();
  const { trip } = await start(d1, routeId, v1);
  const relief = id();
  const reliefDriverId = id();
  await handover(owner, trip.tripId, relief, reliefDriverId);
  const stored = await Trip.findById(trip.tripId);
  assert.equal(stored.activeDriverUserId.toString(), relief.toString());
  assert.equal(stored.recipients[1].driverId.toString(), reliefDriverId.toString());
  assert.equal(stored.recipients[1].assignedBy.toString(), owner.toString());
});

test("the owner adds extra stops to a running trip; they append after the planned stops for the active driver", async () => {
  const { owner, routeId, d1, v1 } = await setup();
  const { trip } = await start(d1, routeId, v1);
  await assert.rejects(addStops(d1, trip.tripId, [stop("Extra", "DROP", 13.1, 80.4)]), { message: COMPANY_ERRORS.EXTRA_STOPS_NOT_ALLOWED });
  await assert.rejects(addStops(owner, trip.tripId, []), { message: COMPANY_ERRORS.EXTRA_STOPS_REQUIRED });

  const result = await addStops(owner, trip.tripId, [stop("Extra A", "DROP", 13.1, 80.4), stop("Extra B", "DROP", 13.2, 80.5)]);
  assert.deepEqual(result.trip.addedSequences, [3, 4]);
  const stops = await stopsOf(trip.tripId);
  assert.deepEqual(stops.map((s) => s.sequence), [1, 2, 3, 4]);
  const assignmentId = (await Trip.findById(trip.tripId)).recipients[0]._id.toString();
  for (const s of stops) {
    assert.deepEqual(s.recipientsMeta.map((m) => m.recipientId.toString()), [assignmentId]);
  }
  assert.equal((await TripStops.findOne({ companyTripId: routeId })).stops.length, 2);
  assert.equal(eventsOf(E.STOPS_ADDED).length, 1);

  await progress(d1, trip.tripId, 1);
  await progress(d1, trip.tripId, 2);
  await assert.rejects(end(d1, trip.tripId), { message: COMPANY_ERRORS.END_REASON_REQUIRED });
  await progress(d1, trip.tripId, 3);
  assert.equal((await progress(d1, trip.tripId, 4)).trip.canEnd, true);
});

test("a stop added after the driver finished the planned stops becomes the next stop", async () => {
  const { owner, routeId, d1, v1 } = await setup();
  const { trip } = await start(d1, routeId, v1);
  await progress(d1, trip.tripId, 1);
  assert.equal((await progress(d1, trip.tripId, 2)).trip.canEnd, true);
  await addStops(owner, trip.tripId, [stop("Past terminus", "DROP", 13.5, 80.9)]);
  const current = await tripService.getDriverCurrentTripDetails(d1.toString());
  assert.deepEqual(current.tripStop.stops.map((s) => s.sequence), [1, 2, 3]);
  assert.equal((await progress(d1, trip.tripId, 3)).trip.canEnd, true);
});

test("extra stops added around a handover reach the new driver", async () => {
  const { owner, routeId, d1, d2, v1 } = await setup();
  const { trip } = await start(d1, routeId, v1);
  await Promise.all([handover(d1, trip.tripId, d2), addStops(owner, trip.tripId, [stop("Extra", "DROP", 13.1, 80.4)])]);
  const stored = await Trip.findById(trip.tripId);
  const active = stored.recipients.find((r) => r.userId.equals(d2));
  const stops = await stopsOf(trip.tripId);
  assert.deepEqual(stops.map((s) => s.sequence), [1, 2, 3]);
  for (const s of stops) {
    assert.ok(s.recipientsMeta.some((m) => m.recipientId.equals(active._id)), `stop ${s.sequence}`);
  }
});

test("concurrent extra-stop requests never duplicate or skip sequence numbers", async () => {
  const { owner, routeId, d1, v1 } = await setup();
  const { trip } = await start(d1, routeId, v1);
  const results = await Promise.allSettled([
    addStops(owner, trip.tripId, [stop("A", "DROP", 1, 1)]),
    addStops(owner, trip.tripId, [stop("B", "DROP", 2, 2)]),
  ]);
  assert.ok(results.some((r) => r.status === "fulfilled"));
  for (const r of results.filter((x) => x.status === "rejected")) {
    assert.equal(r.reason.message, COMPANY_ERRORS.RUN_CONFLICT);
  }
  const sequences = (await stopsOf(trip.tripId)).map((s) => s.sequence);
  assert.deepEqual(sequences, sequences.map((_, i) => i + 1));
});

test("stops cannot be added to an ended run", async () => {
  const { owner, routeId, d1, v1 } = await setup();
  const { trip } = await start(d1, routeId, v1);
  await end(d1, trip.tripId, "done early");
  await assert.rejects(addStops(owner, trip.tripId, [stop("Late", "DROP", 1, 1)]), { message: COMPANY_ERRORS.RUN_TRIP_NOT_FOUND });
});

test("existing owner and driver views keep working for runs", async () => {
  const { owner, routeId, d1, d2, v1 } = await setup();
  const { trip } = await start(d1, routeId, v1);
  const active = await tripService.listCompanyActiveTrips(owner);
  assert.equal(active.length, 1);
  assert.equal(active[0]._id.toString(), trip.tripId.toString());
  const details = await tripService.getCompanyTripDetails(trip.tripId.toString(), owner);
  assert.equal(details._id.toString(), trip.tripId.toString());
  const current = await tripService.getDriverCurrentTripDetails(d1.toString());
  assert.equal(current.trip[0]._id.toString(), trip.tripId.toString());
  assert.equal(current.tripStop.stops.length, 2);
  await handover(d1, trip.tripId, d2);
  assert.equal((await tripService.listCompanyActiveTrips(owner)).length, 1);
  await end(d2, trip.tripId, "finished early");
  assert.equal((await tripService.listCompanyActiveTrips(owner)).length, 0);
});

test("the normal booking flow is unaffected and never produces a company run", async () => {
  const [customer, driver] = [id(), id()];
  const request = await tripService.createTripRequest({
    userId: customer,
    body: { data: { tripMode: "SINGLE", bookingType: "INDEPENDENT_TRIP", recipients: [{ userId: driver, driverId: id(), vehicleId: id() }], stops: STOPS } },
  });
  await tripService.acceptTripRequestForDriver({ userId: driver, tripId: request._id.toString() });
  const booked = await Trip.findOne({ tripRequestId: request._id });
  assert.equal(booked.companyRouteId, undefined);
  assert.equal(booked.activeDriverUserId, undefined);
  assert.equal(booked.status, S.ACCEPTED);
  assert.equal(await Trip.countDocuments({ companyRouteId: { $exists: true } }), 0);
});
