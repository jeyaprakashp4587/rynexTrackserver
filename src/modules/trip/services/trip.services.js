import * as tripRepo from "../repositories/trip.repositories.js";
import { formatRecipients } from "../utils/formatRecipients.js";
import { formatTripStop } from "../utils/formatTripStop.js";
import { TRIP_STATUS, TRIP_TYPE } from "../constants/trip.constants.js";

export const requestTrip = async ({ body, userId }) => {
  const { data } = body;

  const { tripMode, bookingType, recipients, stops } = data;

  const formattedRecipients = formatRecipients(recipients, userId);

  const tripRequest = await tripRepo.createTripRequest({
    createdBy: userId,
    tripType: bookingType,
    tripMode,
    recipients: formattedRecipients,
    status: TRIP_STATUS.PENDING,
  });

  const formattedStops = formatTripStop(stops);

  await tripRepo.createTripStops({
    tripRequestId: tripRequest._id,
    stops: formattedStops,
  });

  return tripRequest;
};

export const getRequestTrips = async (userId) => {
  return tripRepo.getRequestTrips(userId);
};

export const getParticularRequestedTrip = async (tripId, userId) => {
  return tripRepo.getParticularRequestedTrip(tripId, userId);
};

export const acceptTrip = async ({ body, userId }) => {
  const { recipients, tripId } = body;

  let formattedRecipients = [];

  if (recipients?.length) {
    formattedRecipients = formatRecipients(recipients, userId);
  }

  const tripRequest = await tripRepo.findTripRequestById(tripId);

  if (!tripRequest) {
    throw new Error("Trip request not found");
  }

  if (tripRequest.type === TRIP_TYPE.COMPANY) {
    await tripRepo.assignTripToDriver({
      tripId,
      recipients: formattedRecipients,
    });

    return {
      message: "Trip assigned successfully",
    };
  }

  const updatedTrip = await tripRepo.acceptTripRequest(tripId);

  if (!updatedTrip) {
    throw new Error("Trip already accepted");
  }

  return {
    message: "Trip accepted successfully",
  };
};
