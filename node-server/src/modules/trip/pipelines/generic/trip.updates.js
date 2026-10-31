import {
  REQUEST_OPEN_STATUSES,
  DEFAULT_VEHICLES_REQUIRED,
  TRIP_STATUS,
  TRIP_TYPE,
} from "../../constants/shared/trip.constants.js";
import { isPendingFor, mapRecipientsWhere } from "../../utils/shared/pipelineExpressions.js";

const acceptedCount = { $ifNull: ["$acceptedCount", 0] };
const vehiclesRequired = {
  $ifNull: ["$vehiclesRequired", DEFAULT_VEHICLES_REQUIRED],
};

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
      recipients: mapRecipientsWhere(isPendingFor(userId), {
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
      recipients: mapRecipientsWhere(
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
      recipients: mapRecipientsWhere(isPendingFor(userId), {
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
