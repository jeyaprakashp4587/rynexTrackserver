import mongoose from "mongoose";
import { Aggregator, Query } from "mingo";

const toPlain = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value instanceof Date) return new Date(value);
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlain(item)]));
  }
  return value;
};

const duplicate = (keyPattern) =>
  Object.assign(new Error("E11000 duplicate key"), { code: 11000, keyPattern });

const withoutTypeCheck = ({ companyRouteId, ...rest }) => rest;

export const createFakeRunRepo = () => {
  const db = { routes: [], templates: [], trips: [], stops: [] };
  const hooks = { beforeUpdate: null, beforeAppend: null };
  const ids = (value) => String(value);

  const openTrips = () => db.trips.filter((t) => t.isTripEnded === false);
  const assertUnique = (candidate, ignoreId) => {
    for (const other of openTrips()) {
      if (other._id === candidate._id || other._id === ignoreId) continue;
      if (candidate.activeDriverUserId && other.activeDriverUserId === candidate.activeDriverUserId) throw duplicate({ activeDriverUserId: 1 });
      if (candidate.activeVehicleId && other.activeVehicleId === candidate.activeVehicleId) throw duplicate({ activeVehicleId: 1 });
    }
  };

  const repo = {
    findDriverCompanyRoutes: async () => [],
    findCompanyRouteById: async (routeId) => structuredClone(db.routes.find((r) => r._id === ids(routeId))) ?? null,
    findRouteTemplateStops: async (routeId) => structuredClone(db.templates.find((t) => t.companyTripId === ids(routeId))) ?? null,
    findRunById: async (tripId) => structuredClone(db.trips.find((t) => t._id === ids(tripId) && t.companyRouteId)) ?? null,
    findRunByRunId: async ({ routeId, runId }) => structuredClone(db.trips.find((t) => t.companyRouteId === ids(routeId) && t.runId === runId)) ?? null,
    findOpenRunByDriver: async (userId) => structuredClone(openTrips().find((t) => t.activeDriverUserId === ids(userId))) ?? null,
    createRun: async (payload) => {
      const doc = toPlain(payload);
      if (doc.runId && db.trips.some((t) => t.companyRouteId === doc.companyRouteId && t.runId === doc.runId)) throw duplicate({ companyRouteId: 1, runId: 1 });
      assertUnique(doc);
      db.trips.push(doc);
      return structuredClone(doc);
    },
    ensureRunStops: async ({ tripId, stops }) => {
      const existing = db.stops.find((s) => s.tripId === ids(tripId));
      if (existing) return structuredClone(existing);
      const doc = { tripId: ids(tripId), stops: toPlain(stops).map((s, i) => ({ _id: `s${db.stops.length}-${i}`, ...s })) };
      db.stops.push(doc);
      return structuredClone(doc);
    },
    findRunStops: async (tripId) => structuredClone(db.stops.find((s) => s.tripId === ids(tripId))) ?? null,
    addAssignmentMeta: async ({ tripId, recipientId, fromSequence }) => {
      const doc = db.stops.find((s) => s.tripId === ids(tripId));
      if (!doc) return { matchedCount: 0 };
      for (const stop of doc.stops) {
        if (stop.sequence >= fromSequence && !stop.recipientsMeta.some((m) => m.recipientId === ids(recipientId))) {
          stop.recipientsMeta.push({ recipientId: ids(recipientId), status: "PENDING" });
        }
      }
      return { matchedCount: 1 };
    },
    appendRunStops: async ({ tripId, stopCount, stops }) => {
      hooks.beforeAppend?.(db);
      const doc = db.stops.find((s) => s.tripId === ids(tripId) && s.stops.length === stopCount);
      if (!doc) return null;
      doc.stops.push(...toPlain(stops));
      return structuredClone(doc);
    },
    updateRun: async ({ filter, update }) => {
      hooks.beforeUpdate?.(db);
      const query = new Query(withoutTypeCheck(toPlain(filter)));
      const index = db.trips.findIndex((t) => query.test(t));
      if (index < 0) return null;
      const [next] = new Aggregator(toPlain(update)).run([structuredClone(db.trips[index])]);
      assertUnique(next, db.trips[index]._id);
      db.trips[index] = next;
      return structuredClone(next);
    },
  };

  return { db, hooks, repo };
};

export const seedRoute = ({ db, owner, drivers, stops }) => {
  const routeId = new mongoose.Types.ObjectId().toString();
  db.routes.push({
    _id: routeId,
    createdBy: owner,
    tripStopMode: "MULTI_STOP",
    status: "WAITING_FOR_DRIVER",
    recipients: drivers.map(({ userId, vehicleId, driverId }) => ({
      _id: new mongoose.Types.ObjectId().toString(),
      userId,
      driverUserId: userId,
      driverId: driverId ?? new mongoose.Types.ObjectId().toString(),
      vehicleId,
      assignedBy: owner,
      status: "PENDING",
    })),
  });
  db.templates.push({
    companyTripId: routeId,
    tripId: null,
    stops: stops.map((s, index) => ({
      sequence: index + 1,
      stopType: s.stopType,
      locationName: s.locationName,
      coords: { type: "Point", coordinates: [s.lon, s.lat] },
      recipientsMeta: [{ recipientId: drivers[0].userId, contactPerson: "Conductor", contactPhone: "100", notes: "n" }],
    })),
  });
  return routeId;
};
