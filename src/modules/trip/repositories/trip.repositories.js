import mongoose from "mongoose";

import tripRequests from "../models/tripRequests.model.js";

import TripStops from "../models/tripStops..model.js";

import trip from "../models/trip.model.js";

import { TRIP_STATUS, TRIP_TYPE } from "../constants/trip.constants.js";

import {
  getParticularTripPipeline,
  getRequestTripsPipeline,
} from "../pipelines/trip.pipelines.js";

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
  return tripRequests.aggregate(getParticularTripPipeline(tripId, userId));
};

export const findTripRequestById = async (tripId) => {
  return tripRequests.findById(tripId);
};

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

export const acceptTripRequest = async (tripId) => {
  return tripRequests.findOneAndUpdate(
    {
      _id: tripId,
      status: TRIP_STATUS.PENDING,
    },
    {
      $set: {
        status: TRIP_STATUS.ACCEPTED,
      },
    },
    {
      new: true,
    }
  );
};
