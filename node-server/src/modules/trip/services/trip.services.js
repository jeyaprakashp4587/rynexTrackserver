import * as tripRepo from "../repositories/trip.repositories.js";
import { formatRecipients } from "../utils/formatRecipients.js";
import { formatTripStop } from "../utils/formatTripStop.js";
import { TRIP_STATUS, TRIP_TYPE } from "../constants/trip.constants.js";
import mongoose from "mongoose";

export const requestTrip = async ({ body, userId }) => {
  const { data } = body;

  const { tripMode, bookingType, recipients, stops } = data;

  const formattedRecipients = formatRecipients(recipients, userId);

  const tripRequest = await tripRepo.createTripRequest({
    createdBy: [userId],
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
  const trip = await tripRepo.getParticularRequestedTrip(tripId, userId);
  return trip[0];
};

export const acceptTrip = async ({ body, userId }) => {
  const { recipients, tripId } = body;

  console.log("Recipients received:", recipients);

  try {
    let formattedRecipients = [];

    if (recipients?.length) {
      formattedRecipients = formatRecipients(recipients, userId);
    }

    const tripRequest = await tripRepo.findTripRequestById({
      tripId,
    });

    console.log("Trip request:", tripRequest);

    if (!tripRequest) {
      throw new Error("Trip request not found");
    }

    if (tripRequest.tripType === TRIP_TYPE.COMPANY) {
      console.log("Trip request type:", tripRequest.tripType);

      const assignmentResult = await tripRepo.assignTripToDriver({
        tripRequestId: tripId,
        recipients: formattedRecipients,
      });

      console.log("Trip assignment result:", assignmentResult);

      if (!assignmentResult || assignmentResult.matchedCount <= 0) {
        return {
          message: "Trip assignment failed",
        };
      }

      return {
        message: "Trip assigned successfully",
        trip: tripRequest,
      };
    }

    console.log("Independent driver flow");

    const currentRecipient = tripRequest?.recipients?.find(
      (recipient) => recipient.userId.toString() === userId.toString()
    );

    if (!currentRecipient) {
      throw new Error("Recipient not found");
    }

    const acceptedTripRequest = await tripRepo.updateTripRequestAccepted({
      tripId,
      userId,
    });

    if (!acceptedTripRequest) {
      throw new Error("Trip already accepted");
    }

    let acceptedTrip = await tripRepo.findTripByRequestId({
      tripRequestId: tripId,
    });

    if (!acceptedTrip) {
      acceptedTrip = await tripRepo.createTrip({
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

    await tripRepo.addRecipientToTrip({
      tripId: acceptedTrip._id,
      recipientData: tripRecipient,
    });

    await tripRepo.updateTripStopsRecipients({
      tripRequestId: tripId,
      tripId: acceptedTrip._id,
      recipientId: tripRecipientId,
    });

    await tripRepo.updateVehicleAvailability({
      vehicleId: currentRecipient.vehicleId,
      currentlyAvailable: false,
    });

    await tripRepo.updateDriverAvailability({
      driverId: currentRecipient.driverId,
      currentlyAvailable: false,
    });

    return {
      message: "Trip accepted successfully",
      trip: acceptedTrip,
    };
  } catch (error) {
    throw error;
  } finally {
  }
};
// get current trip details, for only drivers
export const getCurrentTripDetails = async (userId) => {
  try {
    const trip = await tripRepo.findAcceptedTripByRecipientId(userId);
    // console.log("trip details", trip);

    const tripStop = await tripRepo.getStopsByRecipientId(
      trip[0]._id,
      trip[0].users[0].recipientId
    );
    // console.log("trip stop", tripStop);

    return { trip, tripStop: tripStop[0] };
  } catch (error) {
    throw error;
  }
};

export const updateTripStop = async ({ body, userId }) => {
  try {
    const { tripId, stopSequence, podImage, status } = body;
    // Find the trip by and finc receipts and reutthat receipts ids
    const recipientId = await tripRepo.findTripRecipientId(tripId, userId);
    if (!recipientId) {
      throw new Error("Trip not found");
    }

    // Mark the trip stop as updated
    await tripRepo.updateTripStopStatus(
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

// get all company current trips for company only
export const getCompanyCurrentTrips = async (userId) => {
  try {
    const trips = await tripRepo.getCompanyCurrentTrips(userId);
    // console.log("trips", trips);

    return trips;
  } catch (error) {
    throw error;
  }
};

export const getParticularCompanyCurrentTripDetails = async (
  tripId,
  userId
) => {
  try {
    const trip = await tripRepo.getParticularCompanyCurrentTripRepo(
      tripId,
      userId
    );
    // console.log("trip from service duo", trip);
    return trip[0];
  } catch (error) {
    throw error;
  }
};
