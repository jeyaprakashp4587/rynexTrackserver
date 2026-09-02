import * as tripService from "../services/trip.services.js";

import {
  successResponse,
  errorResponse,
} from "../../../shared/utils/response.js";

export const createTripRequest = async (req, res) => {
  try {
    const result = await tripService.createTripRequest({
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

export const listTripRequests = async (req, res) => {
  try {
    const trips = await tripService.listTripRequests(req.userId);

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

export const getTripRequestDetails = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await tripService.getTripRequestDetails(tripId, req.userId);

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

export const acceptTripRequestForOwner = async (req, res) => {
  try {
    const result = await tripService.acceptTripRequestForOwner({
      body: { ...req.body, tripId: req.params.tripId || req.body.tripId },
      userId: req.userId,
      tripId: req.params.tripId,
    });

    return successResponse({
      res,
      statusCode: 200,
      message: result.message,
      data: result.trip,
    });
  } catch (error) {
    return errorResponse({ res, statusCode: 500, message: error.message });
  }
};

export const acceptTripRequestForDriver = async (req, res) => {
  try {
    const result = await tripService.acceptTripRequestForDriver({
      body: { ...req.body, tripId: req.params.tripId || req.body.tripId },
      userId: req.userId,
      tripId: req.params.tripId,
    });

    return successResponse({
      res,
      statusCode: 200,
      message: result.message,
      data: result.trip,
    });
  } catch (error) {
    return errorResponse({ res, statusCode: 500, message: error.message });
  }
};

export const getDriverCurrentTripDetails = async (req, res) => {
  try {
    const trip = await tripService.getDriverCurrentTripDetails(req.userId);
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

export const updateTripStopProgress = async (req, res) => {
  try {
    const result = await tripService.updateTripStopProgress({
      body: req.body,
      userId: req.userId,
    });

    return successResponse({
      res,
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: 500,
      message: error.message,
    });
  }
};

export const listCompanyActiveTrips = async (req, res) => {
  try {
    const trips = await tripService.listCompanyActiveTrips(req.userId);

    return successResponse({
      res,
      statusCode: 200,
      message: "Trips fetched successfully",
      data: trips,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: 500,
      message: "Failed to get trips",
    });
  }
};

export const getCompanyTripDetails = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await tripService.getCompanyTripDetails(tripId, req.userId);

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
