import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Aggregator, Query } from "mingo";

const base = "./harness/src/modules/trip";
const requestUpdates = await import(`${base}/pipelines/trip.updates.js`);
const runUpdates = await import(`${base}/pipelines/company.run.updates.js`);
const runPipelines = await import(`${base}/pipelines/company.run.pipelines.js`);
const { TRIP_STATUS: S } = await import(`${base}/constants/trip.constants.js`);

const apply = (pipeline, doc) => new Aggregator(pipeline).run([structuredClone(doc)])[0];
const matches = (filter, doc) => new Query(filter).test(doc);
const withoutTypeChecks = ({ companyRouteId, ...rest }) => rest;
const byUser = (doc, userId) => doc.recipients.find((r) => r.userId === userId);

const request = (overrides = {}) => ({
  _id: "req1",
  status: S.PENDING,
  vehiclesRequired: 1,
  acceptedCount: 0,
  recipients: ["A", "B", "C"].map((userId) => ({ userId, status: S.PENDING })),
  ...overrides,
});

const claim = (doc, userId) => {
  const filter = requestUpdates.buildClaimAcceptanceFilter("req1", userId);
  return matches(filter, doc) ? apply(requestUpdates.buildClaimAcceptanceUpdate(userId), doc) : null;
};

test("exclusive booking: first claim wins, the loser no longer matches the conditional update", () => {
  const afterA = claim(request(), "A");
  assert.equal(afterA.status, S.ACCEPTED);
  assert.equal(afterA.acceptedCount, 1);
  assert.equal(byUser(afterA, "A").status, S.ACCEPTED);
  assert.ok(byUser(afterA, "A").acceptedAt);
  assert.equal(byUser(afterA, "B").status, S.EXPIRED);
  assert.equal(byUser(afterA, "C").status, S.EXPIRED);
  assert.equal(claim(afterA, "B"), null);
  assert.equal(claim(afterA, "A"), null);
});

test("multi-vehicle booking stays open until the quota is met, then expires the rest", () => {
  const doc = request({ vehiclesRequired: 2 });
  const afterA = claim(doc, "A");
  assert.equal(afterA.status, S.PENDING);
  assert.equal(afterA.acceptedCount, 1);
  assert.equal(byUser(afterA, "B").status, S.PENDING);
  const afterB = claim(afterA, "B");
  assert.equal(afterB.status, S.ACCEPTED);
  assert.equal(afterB.acceptedCount, 2);
  assert.equal(byUser(afterB, "C").status, S.EXPIRED);
  assert.equal(claim(afterB, "C"), null);
});

test("claim works for owner-assigned requests and legacy documents without counters", () => {
  const waiting = request({ status: S.WAITING_FOR_DRIVER });
  assert.equal(claim(waiting, "A").status, S.ACCEPTED);
  const { vehiclesRequired, acceptedCount, ...legacy } = request();
  const afterLegacy = claim(legacy, "B");
  assert.equal(afterLegacy.acceptedCount, 1);
  assert.equal(afterLegacy.status, S.ACCEPTED);
  assert.equal(claim(request({ status: S.REJECTED }), "A"), null);
  assert.equal(claim(request({ acceptedCount: 1 }), "A"), null);
  assert.equal(claim(request({ vehiclesRequired: 2, acceptedCount: 2 }), "A"), null);
  assert.ok(claim(request({ vehiclesRequired: 2, acceptedCount: 1 }), "A"));
  assert.equal(claim(request({ recipients: [{ userId: "A", status: S.REJECTED }] }), "A"), null);
});

test("reject closes the request only when nobody is pending, honouring earlier acceptances", () => {
  const reject = (doc, userId) => {
    const filter = requestUpdates.buildOpenPendingCandidateFilter("req1", userId);
    return matches(filter, doc) ? apply(requestUpdates.buildRejectUpdate(userId), doc) : null;
  };
  const afterA = reject(request(), "A");
  assert.equal(byUser(afterA, "A").status, S.REJECTED);
  assert.ok(byUser(afterA, "A").rejectedAt);
  assert.equal(afterA.status, S.PENDING);
  const afterB = reject(afterA, "B");
  const afterC = reject(afterB, "C");
  assert.equal(afterC.status, S.REJECTED);
  assert.equal(reject(afterC, "C"), null);
  const partial = request({ vehiclesRequired: 2, acceptedCount: 1, recipients: [{ userId: "A", status: S.ACCEPTED }, { userId: "B", status: S.PENDING }] });
  assert.equal(reject(partial, "B").status, S.ACCEPTED);
});

test("owner assignment replaces only the owner's pending entry", () => {
  const doc = request({ recipients: [{ userId: "OWNER", status: S.PENDING }, { userId: "OTHER", status: S.PENDING }] });
  const assignments = [{ userId: "D1", status: S.PENDING }, { userId: "D2", status: S.PENDING }];
  const filter = requestUpdates.buildOpenPendingCandidateFilter("req1", "OWNER");
  assert.ok(matches(filter, doc));
  const updated = apply(requestUpdates.buildAssignDriversUpdate("OWNER", assignments), doc);
  assert.deepEqual(updated.recipients.map((r) => r.userId).sort(), ["D1", "D2", "OTHER"]);
  assert.equal(updated.status, S.WAITING_FOR_DRIVER);
  assert.equal(updated.tripType, "INDEPENDENT_TRIP");
  assert.ok(!matches(requestUpdates.buildOpenPendingCandidateFilter("req1", "STRANGER"), doc));
});

const runDoc = (overrides = {}) => ({
  _id: "trip1",
  companyRouteId: "route1",
  status: S.ACCEPTED,
  isTripEnded: false,
  activeDriverUserId: "D1",
  recipients: [{ _id: "a1", userId: "D1", status: S.ACCEPTED, currentStopIndex: 3 }],
  ...overrides,
});

const activeFilter = (overrides = {}) =>
  withoutTypeChecks(
    runUpdates.buildActiveAssignmentFilter({ tripId: "trip1", driverUserId: "D1", assignmentId: "a1", currentStopIndex: 3, ...overrides })
  );

test("end update completes or cancels only the active assignment and closes the trip", () => {
  const doc = runDoc({ recipients: [{ _id: "a0", userId: "D0", status: S.CANCELLED, cancelReason: "DRIVER_HANDOVER" }, { _id: "a1", userId: "D1", status: S.ACCEPTED, currentStopIndex: 3 }] });
  const done = apply(runUpdates.buildEndRunUpdate({ assignmentId: "a1", completed: true }), doc);
  assert.equal(done.status, S.COMPLETED);
  assert.equal(done.isTripEnded, true);
  assert.ok(done.completedAt);
  assert.equal(done.recipients[1].status, S.COMPLETED);
  assert.ok(done.recipients[1].completedAt);
  assert.equal(done.recipients[0].status, S.CANCELLED);
  assert.equal(done.recipients[0].cancelReason, "DRIVER_HANDOVER");
  const early = apply(runUpdates.buildEndRunUpdate({ assignmentId: "a1", completed: false, reason: "$bus broke down" }), doc);
  assert.equal(early.status, S.CANCELLED);
  assert.equal(early.recipients[1].status, S.CANCELLED);
  assert.equal(early.recipients[1].cancelReason, "$bus broke down");
  assert.ok(early.recipients[1].cancelledAt);
  assert.equal(early.isTripEnded, true);
});

test("active-assignment filter only matches the exact expected state", () => {
  assert.ok(matches(activeFilter(), runDoc()));
  assert.ok(!matches(activeFilter({ currentStopIndex: 2 }), runDoc()));
  assert.ok(!matches(activeFilter({ driverUserId: "D2" }), runDoc()));
  assert.ok(!matches(activeFilter({ assignmentId: "zz" }), runDoc()));
  assert.ok(!matches(activeFilter(), runDoc({ isTripEnded: true })));
  assert.ok(!matches(activeFilter(), runDoc({ recipients: [{ _id: "a1", userId: "D1", status: S.CANCELLED, currentStopIndex: 3 }] })));
  const typed = runUpdates.buildActiveAssignmentFilter({ tripId: "t", driverUserId: "d", assignmentId: "a", currentStopIndex: 1 });
  assert.deepEqual(typed.companyRouteId, { $type: "objectId" });
});

test("handover update retires the previous assignment, appends the new one and switches the active driver", () => {
  const assignment = { _id: "a2", userId: "D2", status: S.ACCEPTED, currentStopIndex: 3, vehicleId: "V1" };
  const doc = runDoc();
  const updated = apply(runUpdates.buildHandoverUpdate({ previousAssignmentId: "a1", assignment }), doc);
  assert.equal(updated.activeDriverUserId, "D2");
  assert.equal(updated.recipients.length, 2);
  assert.equal(updated.recipients[0].status, S.CANCELLED);
  assert.equal(updated.recipients[0].cancelReason, "DRIVER_HANDOVER");
  assert.ok(updated.recipients[0].cancelledAt);
  assert.deepEqual(updated.recipients[1], assignment);
  assert.equal(updated.isTripEnded, false);
  assert.ok(!matches(activeFilter(), updated));
  assert.ok(matches(activeFilter({ driverUserId: "D2", assignmentId: "a2" }), updated));
});

test("driver route list pipeline is shaped for the app and excludes inactive assignments", () => {
  const userId = new mongoose.Types.ObjectId();
  const pipeline = runPipelines.buildDriverCompanyRoutesPipeline(userId.toString());
  const stages = pipeline.map((stage) => Object.keys(stage)[0]);
  assert.deepEqual(stages, ["$match", "$addFields", "$unwind", "$lookup", "$unwind", "$lookup", "$lookup", "$project", "$sort"]);
  const match = pipeline[0].$match.recipients.$elemMatch;
  assert.deepEqual(match.status, { $nin: ["REJECTED", "CANCELLED", "EXPIRED"] });
  assert.equal(match.$or.length, 2);
  const openTrip = pipeline[6].$lookup;
  assert.equal(openTrip.from, "trips");
  assert.ok(openTrip.pipeline[0].$match.$expr.$and.length === 3);
  assert.equal(pipeline[5].$lookup.foreignField, "companyTripId");
  assert.ok(pipeline[7].$project.openTrip);
});
