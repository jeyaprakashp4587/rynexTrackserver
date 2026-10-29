import tripRequests from "../models/tripRequests.model.js";
import TripStops from "../models/tripStops.model.js";
import { companyRoutes } from "../models/company.tripRoute.models.js";
import {
  MONGO_ERROR_CODES,
  TRIP_STATUS,
  TRIP_STOP_STATUS,
} from "../constants/trip.constants.js";

import {
  buildCompanyActiveTripsPipeline,
  buildCompanyRoutesListPipeline,
  buildCompanyTripDetailPipeline,
  buildDriverCurrentTripPipeline,
  buildRecipientStopsPipeline,
  buildTripRequestDetailPipeline,
  buildTripRequestListPipeline,
} from "../pipelines/trip.pipelines.js";
import {
  buildAssignDriversUpdate,
  buildClaimAcceptanceFilter,
  buildClaimAcceptanceUpdate,
  buildOpenPendingCandidateFilter,
  buildRejectUpdate,
} from "../pipelines/trip.updates.js";

import { trip } from "../models/trip.model.js";

export const createTripRequestRecord = async (payload) => {
  const result = await tripRequests.create([payload]);
  return result[0];
};

export const createCompanyTripRecord = async (payload) => {
  const result = await companyRoutes.create([payload]);
  return result[0];
};

export const createTripStopRecords = async (payload) => {
  return TripStops.create([payload]);
};

export const createCompanyTripStopRecords = async (payload) => {
  return TripStops.create([payload]);
};

export const listTripRequestsByUser = async (userId) => {
  return tripRequests.aggregate(buildTripRequestListPipeline(userId));
};

export const getTripRequestDetailById = async (tripRequestId, userId) => {
  return tripRequests.aggregate(
    buildTripRequestDetailPipeline(tripRequestId, userId)
  );
};

export const findPendingTripRequestForUser = async (tripRequestId, userId) => {
  return tripRequests.findOne(
    buildOpenPendingCandidateFilter(tripRequestId, userId)
  );
};

export const findTripRequestById = async ({ tripId }) => {
  return tripRequests.findById(tripId);
};

export const assignDriversToRequest = async ({
  tripRequestId,
  ownerUserId,
  recipients,
}) => {
  return tripRequests.findOneAndUpdate(
    buildOpenPendingCandidateFilter(tripRequestId, ownerUserId),
    buildAssignDriversUpdate(ownerUserId, recipients),
    { new: true }
  );
};

export const claimRecipientAcceptance = async ({ tripRequestId, userId }) => {
  return tripRequests.findOneAndUpdate(
    buildClaimAcceptanceFilter(tripRequestId, userId),
    buildClaimAcceptanceUpdate(userId),
    { new: true }
  );
};

export const rejectRecipient = async ({ tripRequestId, userId }) => {
  return tripRequests.findOneAndUpdate(
    buildOpenPendingCandidateFilter(tripRequestId, userId),
    buildRejectUpdate(userId),
    { new: true }
  );
};

export const findTripByTripRequestId = async ({ tripRequestId }) => {
  return trip.findOne({ tripRequestId });
};

export const upsertTripForRequest = async ({
  tripRequestId,
  createdBy,
  tripStopMode,
}) => {
  const attempt = () =>
    trip.findOneAndUpdate(
      { tripRequestId },
      {
        $setOnInsert: {
          createdBy,
          tripStopMode,
          status: TRIP_STATUS.ACCEPTED,
          recipients: [],
          isTripEnded: false,
        },
      },
      { upsert: true, new: true }
    );

  try {
    return await attempt();
  } catch (error) {
    if (error?.code === MONGO_ERROR_CODES.DUPLICATE_KEY) {
      return attempt();
    }
    throw error;
  }
};

export const addRecipientToTripRecord = async ({ tripId, recipientData }) => {
  return trip.updateOne(
    {
      _id: tripId,
      "recipients.userId": { $ne: recipientData.userId },
    },
    {
      $push: { recipients: recipientData },
    }
  );
};

export const linkTripStopsToRecipient = async ({
  tripRequestId,
  tripId,
  recipientId,
}) => {
  return TripStops.updateOne(
    {
      tripRequestId,
      "stops.recipientsMeta.recipientId": { $ne: recipientId },
    },
    {
      $set: { tripId },
      $push: {
        "stops.$[].recipientsMeta": {
          recipientId,
          status: TRIP_STOP_STATUS.PENDING,
        },
      },
    }
  );
};

export const findAcceptedTripByRecipientUser = async (userId) => {
  return trip.aggregate(buildDriverCurrentTripPipeline(userId));
};

export const findTripStopsByRecipient = async (tripId, recipientId) => {
  return TripStops.aggregate(buildRecipientStopsPipeline(tripId, recipientId));
};

export const findRecipientIdForTripAndUser = async (
  tripId,
  userId,
  { status, activeOnly = false } = {}
) => {
  const elemMatch = { userId };

  if (status) {
    elemMatch.status = status;
  }

  const filter = { _id: tripId, recipients: { $elemMatch: elemMatch } };

  if (activeOnly) {
    filter.isTripEnded = { $ne: true };
  }

  const tripData = await trip.findOne(filter, { "recipients.$": 1 });

  return tripData?.recipients?.[0]?._id || null;
};

export const updateRecipientStopStatus = async ({
  tripId,
  stopSequence,
  recipientId,
  status,
  proofPhotos,
}) => {
  const now = new Date();
  const set = {
    "stops.$[stop].recipientsMeta.$[meta].status": status,
  };

  if (proofPhotos) {
    set["stops.$[stop].recipientsMeta.$[meta].proofPhotos"] = proofPhotos;
  }

  if (status === TRIP_STOP_STATUS.ARRIVED) {
    set["stops.$[stop].recipientsMeta.$[meta].arrivedAt"] = now;
  } else if (status !== TRIP_STOP_STATUS.PENDING) {
    set["stops.$[stop].recipientsMeta.$[meta].completedAt"] = now;
  }

  return TripStops.updateOne(
    {
      tripId,
      stops: {
        $elemMatch: {
          sequence: stopSequence,
          "recipientsMeta.recipientId": recipientId,
        },
      },
    },
    { $set: set },
    {
      arrayFilters: [
        { "stop.sequence": stopSequence },
        { "meta.recipientId": recipientId },
      ],
    }
  );
};

export const advanceRecipientStopIndex = async ({
  tripId,
  recipientId,
  stopSequence,
}) => {
  return trip.updateOne(
    {
      _id: tripId,
      recipients: {
        $elemMatch: { _id: recipientId, currentStopIndex: stopSequence },
      },
    },
    { $set: { "recipients.$.currentStopIndex": stopSequence + 1 } }
  );
};

export const listCompanyCurrentTrips = async (userId) => {
  return trip.aggregate(buildCompanyActiveTripsPipeline(userId));
};

export const listCompanyRoutesByUser = async (userId) => {
  return companyRoutes.aggregate(buildCompanyRoutesListPipeline(userId));
};

export const getCompanyTripDetailsById = async (tripId, userId) => {
  try {
    return await trip.aggregate(buildCompanyTripDetailPipeline(tripId, userId));
  } catch (error) {
    console.error("getCompanyTripDetailsById error:", error);
    throw error;
  }
};
