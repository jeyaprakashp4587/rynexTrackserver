import * as tripService from "../../services/generic/trip.services.js";
import {
  TRIP_FAILURES,
  TRIP_RESPONSES,
} from "../../constants/generic/trip.messages.js";
import { handleRequest as handle, withData } from "../../utils/shared/handleRequest.js";

export const createTripRequest = handle(
  async (req) => {
    const data = await tripService.createTripRequest({
      body: req.body,
      userId: req.userId,
      requestType: req.params?.requestType,
    });

    return withData(TRIP_RESPONSES.REQUESTED, data);
  },
  { failureMessage: TRIP_FAILURES.REQUEST }
);

export const listTripRequests = handle(
  async (req) =>
    withData(
      TRIP_RESPONSES.FETCHED,
      await tripService.listTripRequests(req.userId)
    ),
  { failureMessage: TRIP_FAILURES.LIST }
);

export const getTripRequestDetails = handle(
  async (req) =>
    withData(
      TRIP_RESPONSES.FETCHED_ONE,
      await tripService.getTripRequestDetails(req.params.tripId, req.userId)
    ),
  { failureMessage: TRIP_FAILURES.GET_ONE }
);

export const acceptTripRequestForOwner = handle(
  async (req) => {
    const result = await tripService.acceptTripRequestForOwner({
      body: { ...req.body, tripId: req.params.tripId || req.body.tripId },
      userId: req.userId,
      tripId: req.params.tripId,
    });

    return withData(result.message, result.trip);
  },
  { failureMessage: TRIP_FAILURES.ACTION, exposeError: true }
);

export const acceptTripRequestForDriver = handle(
  async (req) => {
    const result = await tripService.acceptTripRequestForDriver({
      userId: req.userId,
      tripId: req.params.tripId,
    });

    return withData(result.message, result.trip);
  },
  { failureMessage: TRIP_FAILURES.ACTION, exposeError: true }
);

export const rejectTripRequestForDriver = handle(
  async (req) => {
    const result = await tripService.rejectTripRequestForDriver({
      userId: req.userId,
      tripId: req.params.tripId,
    });

    return withData(result.message, result.trip);
  },
  { failureMessage: TRIP_FAILURES.ACTION, exposeError: true }
);

export const getDriverCurrentTripDetails = handle(
  async (req) =>
    withData(
      TRIP_RESPONSES.FETCHED_ONE,
      await tripService.getDriverCurrentTripDetails(req.userId)
    ),
  { failureMessage: TRIP_FAILURES.GET_ONE }
);

export const updateTripStopProgress = handle(
  async (req) =>
    tripService.updateTripStopProgress({
      body: req.body,
      userId: req.userId,
    }),
  { failureMessage: TRIP_FAILURES.ACTION, exposeError: true }
);
