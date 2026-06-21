import mongoose from "mongoose";

import tripRequests from "../models/tripRequests.model.js";

import TripStops from "../models/tripStops..model.js";
import { Vehicle } from "../../../models/Vehicle.js";
import { Driver } from "../../../models/Driver.js";
import { TRIP_STATUS, TRIP_TYPE } from "../constants/trip.constants.js";

import {
  getParticularTripPipeline,
  getRequestTripsPipeline,
} from "../pipelines/trip.pipelines.js";

import { trip, trip } from "../models/trip.model.js";

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

export const getParticularRequestedTrip = async (tripId, userId) => {
  const aggregate = tripRequests.aggregate(
    getParticularTripPipeline(tripId, userId)
  );
  return aggregate;
};

// trip creation ------------ service repo
export const findTripRequestById = async (tripId) => {
  return tripRequests.findById(tripId);
};
// re make to request trip
export const assignTripToDriver = async ({ tripId, recipients }) => {
  return tripRequests.updateOne(
    {
      _id: tripId,
    },
    {
      $set: {
        recipients,
        type: TRIP_TYPE.INDEPENDENT,
      },
    }
  );
};
// acceptace trip for driver
export const acceptTripRequest = async (tripId, userId, currentUser) => {
  if (!currentUser) {
    throw new Error("Recipient not found");
  }

  const [trip, vehicle, driver, newtrip] = await Promise.all([
    tripRequests.findOneAndUpdate(
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
      }
    ),

    Vehicle.updateOne(
      {
        _id: currentUser.vehicleId,
      },
      {
        $set: {
          currentlyAvailable: false,
        },
      }
    ),

    Driver.updateOne(
      {
        _id: currentUser.driverId,
      },
      {
        $set: {
          currentlyAvailable: false,
        },
      }
    ),
  ]);
  return {
    trip,
    vehicle,
    driver,
  };
};
