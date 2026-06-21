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
  kvfekg;

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
  const trip = await tripRepo.getParticularRequestedTrip(tripId, userId);
  // console.log("logged", trip);
  return trip[0];
};

export const acceptTrip = async ({ body, userId }) => {
  const { recipients, tripId } = body;
  console.log("Accepting trip:", tripId, "for user:", userId);

  let formattedRecipients = [];

  if (recipients?.length) {
    formattedRecipients = formatRecipients(recipients, userId);
  }

  const tripRequest = await tripRepo.findTripRequestById(tripId);
  // console.log("trip", tripRequest);

  if (!tripRequest) {
    throw new Error("Trip request not found");
  }
  // this block for owner reassign the request to other receipts owner
  if (tripRequest.type === TRIP_TYPE.COMPANY) {
    await tripRepo.assignTripToDriver({
      tripId,
      recipients: formattedRecipients,
    });

    return {
      message: "Trip assigned successfully",
    };
  }
  // update trip status _ mean indi driver accept
  const currentUser = recipients.find(
    (user) => user.userId.toString() === userId.toString()
  );
  const updatedTrip = await tripRepo.acceptTripRequest(
    tripId,
    userId,
    currentUser
  );

  if (!updatedTrip) {
    throw new Error("Trip already accepted");
  }

  return {
    message: "Trip accepted successfully",
  };
};
