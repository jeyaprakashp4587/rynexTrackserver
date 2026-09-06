import * as tripRepo from "../repositories/trip.repositories.js";
import { formatRecipients } from "../utils/formatRecipients.js";
import { formatTripStop } from "../utils/formatTripStop.js";
import { TRIP_STATUS } from "../constants/trip.constants.js";
import mongoose from "mongoose";
import { sendMessage } from "../../../kafka/index.js";
import { TOPIC_TRIP_CREATED, buildTripCreated } from "../events/trip.events.js";

export const createTripRequest = async ({ body, userId }) => {
  const { data } = body;

  const { tripMode, bookingType, recipients, stops } = data;

  const formattedRecipients = formatRecipients(recipients, userId);

  const tripRequest = await tripRepo.createTripRequestRecord({
    createdBy: [userId],
    tripType: bookingType,
    tripMode,
    recipients: formattedRecipients,
    status: TRIP_STATUS.PENDING,
  });
  const formattedStops = formatTripStop(stops);

  await tripRepo.createTripStopRecords({
    tripRequestId: tripRequest._id,
    stops: formattedStops,
  });
  // publish trip.created event
  try {
    await sendMessage(TOPIC_TRIP_CREATED, buildTripCreated(tripRequest));
  } catch (e) {
    console.warn("Failed to publish trip.created event:", e.message || e);
  }
  return tripRequest;
};

export const listTripRequests = async (userId) => {
  return tripRepo.listTripRequestsByUser(userId);
};

export const getTripRequestDetails = async (tripId, userId) => {
  const trip = await tripRepo.getTripRequestDetailById(tripId, userId);
  return trip[0];
};

export const acceptTripRequestForOwner = async ({
  body,
  userId,
  tripId: routeTripId,
}) => {
  const tripId = body?.tripId || routeTripId;
  const { recipients } = body;

  if (!tripId) {
    throw new Error("Trip ID is required");
  }

  try {
    const tripRequest = await tripRepo.findTripRequestById({ tripId });

    if (!tripRequest) {
      throw new Error("Trip request not found");
    }

    const formattedRecipients = recipients?.length
      ? formatRecipients(recipients, userId)
      : [];

    const assignmentResult = await tripRepo.assignTripToDriverForRequest({
      tripRequestId: tripId,
      recipients: formattedRecipients,
    });

    if (!assignmentResult || assignmentResult.matchedCount <= 0) {
      return {
        message: "Trip assignment failed",
      };
    }

    return {
      message: "Trip assigned successfully",
      trip: tripRequest,
    };
  } catch (error) {
    throw error;
  }
};

export const acceptTripRequestForDriver = async ({
  body,
  userId,
  tripId: routeTripId,
}) => {
  const tripId = body?.tripId || routeTripId;

  if (!tripId) {
    throw new Error("Trip ID is required");
  }

  try {
    const tripRequest = await tripRepo.findTripRequestById({ tripId });

    if (!tripRequest) {
      throw new Error("Trip request not found");
    }

    const currentRecipient = tripRequest?.recipients?.find(
      (recipient) => recipient.userId.toString() === userId.toString()
    );

    if (!currentRecipient) {
      throw new Error("Recipient not found");
    }

    const acceptedTripRequest = await tripRepo.markTripRequestAccepted({
      tripId,
      userId,
    });

    if (!acceptedTripRequest) {
      throw new Error("Trip already accepted");
    }

    let acceptedTrip = await tripRepo.findTripByTripRequestId({
      tripRequestId: tripId,
    });

    if (!acceptedTrip) {
      acceptedTrip = await tripRepo.createTripRecord({
        payload: {
          tripRequestId: tripId,
          createdBy: acceptedTripRequest.createdBy,
          tripStopMode: acceptedTripRequest.tripStopMode,
          status: TRIP_STATUS.ACCEPTED,
          recipients: [],
        },
      });

      acceptedTrip = acceptedTrip[0];
    }

    const tripRecipientId = new mongoose.Types.ObjectId();

    const tripRecipient = {
      _id: tripRecipientId,
      userId,
      driverId: currentRecipient.driverId,
      vehicleId: currentRecipient.vehicleId,
      assignedBy: currentRecipient.assignedBy,
      assignedAt: new Date(),
      status: TRIP_STATUS.ACCEPTED,
    };

    await tripRepo.addRecipientToTripRecord({
      tripId: acceptedTrip._id,
      recipientData: tripRecipient,
    });

    await tripRepo.linkTripStopsToRecipient({
      tripRequestId: tripId,
      tripId: acceptedTrip._id,
      recipientId: tripRecipientId,
    });

    await tripRepo.setVehicleAvailability({
      vehicleId: currentRecipient.vehicleId,
      currentlyAvailable: false,
    });

    await tripRepo.setDriverAvailability({
      driverId: currentRecipient.driverId,
      currentlyAvailable: false,
    });

    return {
      message: "Trip accepted successfully",
      trip: acceptedTrip,
    };
  } catch (error) {
    throw error;
  }
};

export const getDriverCurrentTripDetails = async (userId) => {
  try {
    const trip = await tripRepo.findAcceptedTripByRecipientUser(userId);

    const tripStop = await tripRepo.findTripStopsByRecipient(
      trip[0]._id,
      trip[0].users[0].recipientId
    );

    return { trip, tripStop: tripStop[0] };
  } catch (error) {
    throw error;
  }
};

export const updateTripStopProgress = async ({ body, userId }) => {
  try {
    const { tripId, stopSequence, podImage, status } = body;
    const recipientId = await tripRepo.findRecipientIdForTripAndUser(
      tripId,
      userId
    );
    if (!recipientId) {
      throw new Error("Trip not found");
    }

    await tripRepo.updateRecipientStopStatus(
      tripId,
      stopSequence,
      podImage,
      recipientId,
      status
    );

    return {
      message: "Trip stop updated successfully",
    };
  } catch (error) {
    throw error;
  }
};

export const listCompanyActiveTrips = async (userId) => {
  try {
    const trips = await tripRepo.listCompanyCurrentTrips(userId);
    return trips;
  } catch (error) {
    throw error;
  }
};

export const getCompanyTripDetails = async (tripId, userId) => {
  try {
    const trip = await tripRepo.getCompanyTripDetailsById(tripId, userId);
    return trip[0];
  } catch (error) {
    throw error;
  }
};
