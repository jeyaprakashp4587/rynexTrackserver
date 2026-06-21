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

// services/trip.service.js

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

  // COMPANY FLOW
  if (tripRequest.type === TRIP_TYPE.COMPANY) {
    await tripRepo.assignTripToDriver({
      tripId,
      recipients: formattedRecipients,
    });

    return {
      message: "Trip assigned successfully",
    };
  }

  // DRIVER ACCEPT FLOW
  const currentUser = recipients.find(
    (user) => user.userId.toString() === userId.toString()
  );

  if (!currentUser) {
    throw new Error("Recipient not found");
  }

  // validate pending request
  const pendingTrip = await tripRepo.findPendingTripRequest(tripId, userId);

  if (!pendingTrip) {
    throw new Error("Trip already accepted");
  }

  // update request accepted
  const updatedRequest = await tripRepo.updateTripRequestAccepted(
    tripId,
    userId
  );

  // find/create trip
  let existingTrip = await tripRepo.findTripByRequestId(tripId);

  if (!existingTrip) {
    existingTrip = await tripRepo.createTrip({
      tripRequestId: tripId,
      createdBy: updatedRequest.createdBy,
      tripMode: updatedRequest.tripMode,
      status: TRIP_STATUS.ACCEPTED,
      recipients: [],
    });
  }

  // recipient meta
  const recipientData = {
    userId,
    driverId: currentUser.driverId,
    vehicleId: currentUser.vehicleId,
    assignedBy: currentUser.assignedBy,
    assignedAt: new Date(),
  };

  // parallel updates
  await Promise.all([
    tripRepo.addRecipientToTrip(existingTrip._id, recipientData),

    tripRepo.updateTripStopsRecipients(tripId, existingTrip._id, userId),

    tripRepo.updateVehicleAvailability(currentUser.vehicleId, false),

    tripRepo.updateDriverAvailability(currentUser.driverId, false),
  ]);

  return {
    message: "Trip accepted successfully",
    trip: existingTrip,
  };
};
