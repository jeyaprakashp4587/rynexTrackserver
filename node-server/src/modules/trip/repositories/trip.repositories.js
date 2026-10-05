import mongoose from "mongoose";
import tripRequests from "../models/tripRequests.model.js";
import TripStops from "../models/tripStops.model.js";
import { Vehicle } from "../../vehicle/models/vehicle.model.js";
import { Driver } from "../../driver/models/driver.model.js";
import { TRIP_STATUS, TRIP_TYPE } from "../constants/trip.constants.js";

import {
  buildCompanyActiveTripsPipeline,
  buildCompanyTripDetailPipeline,
  buildDriverCurrentTripPipeline,
  buildRecipientStopsPipeline,
  buildTripRequestDetailPipeline,
  buildTripRequestListPipeline,
} from "../pipelines/trip.pipelines.js";

import { trip } from "../models/trip.model.js";

export const createTripRequestRecord = async (payload) => {
  const result = await tripRequests.create([payload]);
  return result[0];
};

export const createTripStopRecords = async (payload) => {
  return TripStops.create([payload]);
};

export const listTripRequestsByUser = async (userId) => {
  return tripRequests.aggregate(buildTripRequestListPipeline(userId));
};

export const getTripRequestDetailById = async (tripRequestId, userId) => {
  const aggregate = tripRequests.aggregate(
    buildTripRequestDetailPipeline(tripRequestId, userId)
  );

  return aggregate;
};

export const findPendingTripRequestForUser = async (tripRequestId, userId) => {
  return tripRequests.findOne({
    _id: tripRequestId,
    status: TRIP_STATUS.PENDING,
    "recipients.userId": userId,
  });
};

export const assignTripToDriverForRequest = async ({
  tripRequestId,
  recipients,
}) => {
  console.log("Recipients from service:", recipients, tripRequestId);

  return tripRequests.updateOne(
    {
      _id: tripRequestId,
    },
    {
      $set: {
        status: TRIP_STATUS.ACCEPTED,
        recipients,
        tripType: TRIP_TYPE.INDEPENDENT,
      },
    }
  );
};

export const findTripRequestById = async ({ tripId }) => {
  return tripRequests.findById(tripId);
};

export const markTripRequestAccepted = async ({ tripId, userId }) => {
  return tripRequests.findOneAndUpdate(
    {
      _id: tripId,
      status: TRIP_STATUS.PENDING,
    },
    {
      $set: {
        status: TRIP_STATUS.ACCEPTED,
        "recipients.$[recipient].status": TRIP_STATUS.ACCEPTED,
      },
    },
    {
      new: true,
      arrayFilters: [
        {
          "recipient.userId": userId,
        },
      ],
    }
  );
};

export const findTripByTripRequestId = async ({ tripRequestId }) => {
  return trip.findOne({
    tripRequestId,
  });
};

export const createTripRecord = async ({ payload }) => {
  return trip.create([payload], {});
};

export const addRecipientToTripRecord = async ({ tripId, recipientData }) => {
  return trip.updateOne(
    {
      _id: tripId,
      "recipients.userId": {
        $ne: recipientData.userId,
      },
    },
    {
      $push: {
        recipients: recipientData,
      },
    },
    { new: true }
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
    },
    {
      $set: {
        tripId,
      },
      $push: {
        "stops.$[].recipientsMeta": {
          recipientId,
        },
      },
    },
    { new: true }
  );
};

export const setVehicleAvailability = async ({
  vehicleId,
  currentlyAvailable,
}) => {
  return Vehicle.updateOne(
    {
      _id: vehicleId,
    },
    {
      $set: {
        currentlyAvailable,
      },
    }
  );
};

export const setDriverAvailability = async ({
  driverId,
  currentlyAvailable,
}) => {
  return Driver.updateOne(
    {
      _id: driverId,
    },
    {
      $set: {
        currentlyAvailable,
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

export const findRecipientIdForTripAndUser = async (tripId, userId) => {
  const tripData = await trip.findOne(
    {
      _id: tripId,
      recipients: {
        $elemMatch: { userId },
      },
    },
    {
      "recipients.$": 1,
    }
  );

  return tripData?.recipients?.[0]?._id || null;
};

export const updateRecipientStopStatus = async (
  tripId,
  stopSequence,
  proofPhotos,
  recipientId,
  status
) => {
  return TripStops.updateOne(
    {
      tripId,
      "stops.sequence": stopSequence,
      "stops.recipientsMeta.recipientId": recipientId,
    },
    {
      $set: {
        "stops.$.proofPhotos": proofPhotos,
        "stops.$.status": status,
      },
    },
    { new: true }
  );
};

export const listCompanyCurrentTrips = async (userId) => {
  return trip.aggregate(buildCompanyActiveTripsPipeline(userId));
};

export const getCompanyTripDetailsById = async (tripId, userId) => {
  try {
    const tripdata = await trip.aggregate(
      buildCompanyTripDetailPipeline(tripId, userId)
    );
    return tripdata;
  } catch (error) {
    console.error("getCompanyTripDetailsById error:", error);
    throw error;
  }
};
