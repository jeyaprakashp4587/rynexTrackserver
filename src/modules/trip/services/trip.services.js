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
  return trip[0];
};

export const acceptTrip = async ({ body, userId }) => {
  const { recipients, tripId } = body;

  // const session = await mongoose.startSession();
  //  owner accept request, always they will send receipts from front end
  try {
    // session.startTransaction();

    let formattedRecipients = [];
    if (recipients?.length) {
      formattedRecipients = formatRecipients(recipients, userId);
    }

    const tripRequest = await tripRepo.findTripRequestById({
      tripId,
      // session,
    });
    // console.log("find requestee trip", tripRequest);

    if (!tripRequest) {
      throw new Error("Trip request not found");
    }

    // COMPANY FLOW
    if (tripRequest.type === TRIP_TYPE.COMPANY) {
      await tripRepo.assignTripToDriver({
        tripId,
        recipients: formattedRecipients,
        // session,
      });

      // await session.commitTransaction();

      return {
        message: "Trip assigned successfully",
      };
    }

    // FIND CURRENT USER receipt from trip request

    const currentUser = tripRequest?.recipients?.find(
      (user) => user.userId.toString() === userId.toString()
    );

    if (!currentUser) {
      throw new Error("Recipient not found");
    }

    // ACCEPT REQUEST (ATOMIC)
    const updatedRequest = await tripRepo.updateTripRequestAccepted({
      tripId,
      userId,
      // session,
    });
    // console.log("requested trip staatus ceepeted", updatedRequest);

    if (!updatedRequest) {
      throw new Error("Trip already accepted");
    }

    // FIND EXISTING TRIP
    let existingTrip = await tripRepo.findTripByRequestId({
      tripRequestId: tripId,
      // session,
    });
    // console.log("finded texting tip", existingTrip);

    // CREATE TRIP IF NOT EXISTS
    if (!existingTrip) {
      existingTrip = await tripRepo.createTrip({
        payload: {
          tripRequestId: tripId,
          createdBy: updatedRequest.createdBy,
          tripStopMode: updatedRequest.tripStopMode,
          status: TRIP_STATUS.ACCEPTED,
          recipients: [],
        },
        // session,
      });

      // mongoose create([]) returns array
      existingTrip = existingTrip[0];
      console.log("trip created ", existingTrip);
    }

    // RECIPIENT META
    const recipientData = {
      userId,
      driverId: currentUser.driverId,
      vehicleId: currentUser.vehicleId,
      assignedBy: currentUser.assignedBy,
      assignedAt: new Date(),
    };

    // ADD RECIPIENT TO TRIP
    await tripRepo.addRecipientToTrip({
      tripId: existingTrip._id,
      recipientData,
      // session,
    });
    // console.log("add receipt to trip passed");

    // UPDATE STOPS
    const newTripStop = await tripRepo.updateTripStopsRecipients({
      tripRequestId: tripId,
      tripId: existingTrip._id,
      userId,
      // session,
    });
    console.log("new trip stop", newTripStop);

    // LOCK VEHICLE
    await tripRepo.updateVehicleAvailability({
      vehicleId: currentUser.vehicleId,
      currentlyAvailable: false,
      // session,
    });

    // LOCK DRIVER
    await tripRepo.updateDriverAvailability({
      driverId: currentUser.driverId,
      currentlyAvailable: false,
      // session,
    });

    // COMMIT
    // await session.commitTransaction();

    return {
      message: "Trip accepted successfully",
      trip: existingTrip,
    };
  } catch (err) {
    // ROLLBACK EVERYTHING
    // await session.abortTransaction();

    throw err;
  } finally {
    // session.endSession();
  }
};
