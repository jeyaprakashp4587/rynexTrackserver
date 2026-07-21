import mongoose from "mongoose";
import tripRequests from "../models/tripRequests.model.js";
import TripStops from "../models/tripStops..model.js";
import { Vehicle } from "../../../models/Vehicle.js";
import { Driver } from "../../../models/Driver.js";
import {
  TRIP_STATUS,
  TRIP_STOP_STATUS,
  TRIP_TYPE,
} from "../constants/trip.constants.js";

import {
  getfindAcceptedTripByRecipientPipeline,
  getParticularTripPipeline,
  getRequestTripsPipeline,
  getStopsByRecipientIdPipeLine,
} from "../pipelines/trip.pipelines.js";

import { trip } from "../models/trip.model.js";

export const createTripRequest = async (payload) => {
  const result = await tripRequests.create([payload]);
  return result[0];
};

export const createTripStops = async (payload) => {
  return TripStops.create([payload]);
};

export const getRequestTrips = async (userId) => {
  return tripRequests.aggregate(getRequestTripsPipeline(userId));
};

export const getParticularRequestedTrip = async (tripRequestId, userId) => {
  const aggregate = tripRequests.aggregate(
    getParticularTripPipeline(tripRequestId, userId)
  );
  return aggregate;
};

// trip creation ------------ service repo ---
export const findPendingTripRequest = async (tripRequestId, userId) => {
  return tripRequests.findOne({
    _id: tripRequestId,
    status: TRIP_STATUS.PENDING,
    "recipients.userId": userId,
  });
};

// reassign and re request make to request trip to their drivers
export const assignTripToDriver = async ({ tripRequestId, recipients }) => {
  // update the trip request
  return tripRequests.updateOne(
    {
      _id: tripRequestId,
    },
    {
      $set: {
        recipients,
        type: TRIP_TYPE.INDEPENDENT,
      },
    }
  );
};

export const findTripRequestById = async ({ tripId }) => {
  return tripRequests.findById(tripId);
};

export const updateTripRequestAccepted = async ({ tripId, userId }) => {
  return tripRequests.findOneAndUpdate(
    {
      _id: tripId,
      status: TRIP_STATUS.PENDING,
      "recipients.userId": userId,
    },
    {
      $set: {
        status: TRIP_STATUS.ACCEPTED,
        "recipients.$.status": TRIP_STATUS.ACCEPTED,
      },
    },
    {
      new: true,
      // session,
    }
  );
};

export const findTripByRequestId = async ({ tripRequestId }) => {
  return trip.findOne({
    tripRequestId,
  });
};

export const createTrip = async ({ payload }) => {
  return trip.create([payload], {});
};

export const addRecipientToTrip = async ({ tripId, recipientData }) => {
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

export const updateTripStopsRecipients = async ({
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

export const updateVehicleAvailability = async ({
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

export const updateDriverAvailability = async ({
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
// trip acceptance allocate end driver only
export const findAcceptedTripByRecipientId = async (userId) => {
  return trip.aggregate(getfindAcceptedTripByRecipientPipeline(userId));
};
// driver only
export const getStopsByRecipientId = async (tripId, recipientId) => {
  return TripStops.aggregate(
    getStopsByRecipientIdPipeLine(tripId, recipientId)
  );
};

// get trip receipts
export const findTripRecipientId = async (tripId, userId) => {
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

export const updateTripStopStatus = async (
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
