import mongoose from "mongoose";
import {
  BSON_TYPE,
  TRIP_COLLECTIONS,
} from "../src/modules/trip/constants/shared/trip.constants.js";
import { COMPANY_COLLECTIONS } from "../src/modules/trip/constants/company/company.constants.js";

const APPLY = process.argv.includes("--apply");
const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("MONGO_URI is required");
  process.exit(1);
}

const connection = await mongoose.createConnection(uri).asPromise();
const trips = connection.collection(TRIP_COLLECTIONS.TRIPS);
const tripStops = connection.collection(TRIP_COLLECTIONS.TRIP_STOPS);
const routeStops = connection.collection(COMPANY_COLLECTIONS.ROUTE_STOPS);
const runs = connection.collection(COMPANY_COLLECTIONS.RUNS);
const runStops = connection.collection(COMPANY_COLLECTIONS.RUN_STOPS);

const legacyTemplates = await tripStops
  .find({ companyTripId: { $type: BSON_TYPE.OBJECT_ID } })
  .toArray();
const legacyRuns = await trips
  .find({ companyRouteId: { $type: BSON_TYPE.OBJECT_ID } })
  .toArray();
const legacyRunStops = await tripStops
  .find({ tripId: { $in: legacyRuns.map((run) => run._id) } })
  .toArray();

const report = {
  routeStopDocs: legacyTemplates.length,
  runs: legacyRuns.length,
  runStopDocs: legacyRunStops.length,
};

if (APPLY) {
  for (const doc of legacyTemplates) {
    const { _id, companyTripId, tripId, tripRequestId, ...rest } = doc;
    await routeStops.updateOne(
      { routeId: companyTripId },
      { $setOnInsert: { ...rest, routeId: companyTripId } },
      { upsert: true }
    );
  }

  for (const run of legacyRuns) {
    const { _id, tripRequestId, ...rest } = run;
    await runs.updateOne({ _id }, { $setOnInsert: rest }, { upsert: true });
  }

  for (const doc of legacyRunStops) {
    const { _id, tripId, tripRequestId, companyTripId, ...rest } = doc;
    await runStops.updateOne(
      { runId: tripId },
      { $setOnInsert: { ...rest, runId: tripId } },
      { upsert: true }
    );
  }

  report.copied = {
    routeStops: await routeStops.countDocuments(),
    runs: await runs.countDocuments(),
    runStops: await runStops.countDocuments(),
  };
}

console.log(
  JSON.stringify({ mode: APPLY ? "apply" : "dry-run", report }, null, 2)
);
console.log(
  "Legacy documents are copied, never deleted. Remove them manually after verifying."
);

await connection.close();
