import * as tripService from "../services/trip.services.js";

import {
  successResponse,
  errorResponse,
} from "../../../shared/utils/response.js";

export const requestTrip = async (req, res) => {
  try {
    const result = await tripService.requestTrip({
      body: req.body,
      userId: req.userId,
    });

    return successResponse({
      res,
      data: result,
      message: "Trip requested successfully",
      statusCode: 200,
    });
  } catch (error) {
    console.log(error);

    return errorResponse({
      res,
      statusCode: 500,
      message: "Failed to request trip",
    });
  }
};

export const getRequestTrips = async (req, res) => {
  try {
    const trips = await tripService.getRequestTrips(req.userId);
    // console.log("trips", trips);

    return successResponse({
      res,
      data: trips,
      message: "Trips fetched successfully",
      statusCode: 200,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: 500,
      message: "Failed to get trips",
    });
  }
};

export const getParticularRequestedTripDetails = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await tripService.getParticularRequestedTrip(
      tripId,
      req.userId
    );

    return successResponse({
      res,
      statusCode: 200,
      message: "Trip fetched successfully",
      data: trip,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: 500,
      message: "Failed to get trip",
    });
  }
};

export const acceptTrip = async (req, res) => {
  try {
    const result = await tripService.acceptTrip({
      body: req.body,
      userId: req.userId,
    });

    return successResponse({ res, statusCode: 200, message: result.message });
  } catch (error) {
    return errorResponse({ res, statusCode: 500, message: error.message });
  }
};
