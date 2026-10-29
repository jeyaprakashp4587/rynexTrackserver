import {
  REQUEST_OPEN_STATUSES,
  DEFAULT_VEHICLES_REQUIRED,
  TRIP_STATUS,
  TRIP_TYPE,
} from "../constants/trip.constants.js";

const acceptedCount = { $ifNull: ["$acceptedCount", 0] };
const vehiclesRequired = {
  $ifNull: ["$vehiclesRequired", DEFAULT_VEHICLES_REQUIRED],
};

const isPendingFor = (userId) => ({
  $and: [
    { $eq: ["$$r.userId", userId] },
    { $eq: ["$$r.status", TRIP_STATUS.PENDING] },
  ],
});

const mapRecipients = (cond, patch) => ({
  $map: {
    input: "$recipients",
    as: "r",
    in: {
      $cond: [cond, { $mergeObjects: ["$$r", patch] }, "$$r"],
    },
  },
});

const countPending = {
  $size: {
    $filter: {
      input: "$recipients",
      as: "r",
      cond: { $eq: ["$$r.status", TRIP_STATUS.PENDING] },
    },
  },
};

export const buildOpenPendingCandidateFilter = (tripRequestId, userId) => ({
  _id: tripRequestId,
  status: { $in: REQUEST_OPEN_STATUSES },
  recipients: { $elemMatch: { userId, status: TRIP_STATUS.PENDING } },
});

export const buildClaimAcceptanceFilter = (tripRequestId, userId) => ({
  ...buildOpenPendingCandidateFilter(tripRequestId, userId),
  $expr: { $lt: [acceptedCount, vehiclesRequired] },
});

export const buildClaimAcceptanceUpdate = (userId) => [
  {
    $set: {
      recipients: mapRecipients(isPendingFor(userId), {
        status: TRIP_STATUS.ACCEPTED,
        acceptedAt: "$$NOW",
      }),
      acceptedCount: { $add: [acceptedCount, 1] },
    },
  },
  {
    $set: {
      status: {
        $cond: [
          { $gte: ["$acceptedCount", vehiclesRequired] },
          TRIP_STATUS.ACCEPTED,
          "$status",
        ],
      },
      recipients: mapRecipients(
        {
          $and: [
            { $gte: ["$acceptedCount", vehiclesRequired] },
            { $eq: ["$$r.status", TRIP_STATUS.PENDING] },
          ],
        },
        { status: TRIP_STATUS.EXPIRED }
      ),
    },
  },
];

export const buildRejectUpdate = (userId) => [
  {
    $set: {
      recipients: mapRecipients(isPendingFor(userId), {
        status: TRIP_STATUS.REJECTED,
        rejectedAt: "$$NOW",
      }),
    },
  },
  {
    $set: {
      status: {
        $cond: [
          { $eq: [countPending, 0] },
          {
            $cond: [
              { $gt: [acceptedCount, 0] },
              TRIP_STATUS.ACCEPTED,
              TRIP_STATUS.REJECTED,
            ],
          },
          "$status",
        ],
      },
    },
  },
];

export const buildAssignDriversUpdate = (ownerUserId, assignments) => [
  {
    $set: {
      recipients: {
        $concatArrays: [
          {
            $filter: {
              input: "$recipients",
              as: "r",
              cond: { $not: [isPendingFor(ownerUserId)] },
            },
          },
          { $literal: assignments },
        ],
      },
      status: TRIP_STATUS.WAITING_FOR_DRIVER,
      tripType: TRIP_TYPE.INDEPENDENT,
    },
  },
];
