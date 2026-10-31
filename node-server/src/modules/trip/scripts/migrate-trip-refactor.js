import mongoose from "mongoose";
import {
  CANDIDATE_STATUSES,
  DEFAULT_VEHICLES_REQUIRED,
  TRIP_COLLECTIONS,
  TRIP_STATUS,
} from "../src/modules/trip/constants/trip.constants.js";

const APPLY = process.argv.includes("--apply");
const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("MONGO_URI is required");
  process.exit(1);
}

const connection = await mongoose.createConnection(uri).asPromise();
const requests = connection.collection(TRIP_COLLECTIONS.TRIP_REQUESTS);
const trips = connection.collection(TRIP_COLLECTIONS.TRIPS);

const report = {};

report.requestsMissingCounters = await requests.countDocuments({
  $or: [
    { vehiclesRequired: { $exists: false } },
    { acceptedCount: { $exists: false } },
  ],
});

report.duplicateTripsPerRequest = await trips
  .aggregate([
    { $match: { tripRequestId: { $type: "objectId" } } },
    { $group: { _id: "$tripRequestId", count: { $sum: 1 }, tripIds: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
  ])
  .toArray();

report.acceptedRequestsWithoutTrip = (
  await requests
    .aggregate([
      { $match: { status: TRIP_STATUS.ACCEPTED } },
      { $lookup: { from: TRIP_COLLECTIONS.TRIPS, localField: "_id", foreignField: "tripRequestId", as: "t" } },
      { $match: { t: { $size: 0 } } },
      { $project: { _id: 1 } },
    ])
    .toArray()
).map((doc) => doc._id);

report.invalidRecipientStatuses = await requests.countDocuments({
  "recipients.status": { $nin: CANDIDATE_STATUSES },
});

report.tripAssignmentsWithStringIds = await trips.countDocuments({
  $or: [
    { "recipients.vehicleId": { $type: "string" } },
    { "recipients.assignedBy": { $type: "string" } },
  ],
});

console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry-run", report }, null, 2));

if (report.duplicateTripsPerRequest.length) {
  console.error(
    "Duplicate trips exist for the same tripRequestId. Resolve them manually before deploying the unique index on trips.tripRequestId."
  );
  await connection.close();
  process.exit(2);
}

if (APPLY) {
  const result = await requests.updateMany(
    { $or: [{ vehiclesRequired: { $exists: false } }, { acceptedCount: { $exists: false } }] },
    [
      {
        $set: {
          vehiclesRequired: { $ifNull: ["$vehiclesRequired", DEFAULT_VEHICLES_REQUIRED] },
          acceptedCount: {
            $ifNull: [
              "$acceptedCount",
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ["$recipients", []] },
                    as: "r",
                    cond: { $eq: ["$$r.status", TRIP_STATUS.ACCEPTED] },
                  },
                },
              },
            ],
          },
        },
      },
    ]
  );
  console.log(`Backfilled ${result.modifiedCount} trip requests`);

  await trips.createIndex(
    { tripRequestId: 1 },
    { unique: true, partialFilterExpression: { tripRequestId: { $type: "objectId" } }, background: true }
  );
  console.log("Ensured unique partial index trips.tripRequestId");
}

await connection.close();
