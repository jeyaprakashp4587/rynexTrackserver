import { TRIP_STATUS } from "../../constants/shared/trip.constants.js";

export const mapRecipientsWhere = (cond, patch) => ({
  $map: {
    input: "$recipients",
    as: "r",
    in: {
      $cond: [cond, { $mergeObjects: ["$$r", patch] }, "$$r"],
    },
  },
});

export const mapAssignment = (assignmentId, patch) =>
  mapRecipientsWhere({ $eq: ["$$r._id", assignmentId] }, patch);

export const isPendingFor = (userId) => ({
  $and: [
    { $eq: ["$$r.userId", userId] },
    { $eq: ["$$r.status", TRIP_STATUS.PENDING] },
  ],
});
