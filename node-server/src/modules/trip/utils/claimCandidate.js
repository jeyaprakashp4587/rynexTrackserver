import * as tripRepo from "../repositories/trip.repositories.js";
import { TRIP_STATUS } from "../constants/trip.constants.js";
import { TRIP_ERRORS } from "../constants/trip.messages.js";
import { findRecipientByUserId } from "./findRecipient.js";

export const claimCandidate = async ({ tripRequest, requestId, driverUserId }) => {
  const candidate = findRecipientByUserId(tripRequest.recipients, driverUserId);

  if (!candidate) {
    throw new Error(TRIP_ERRORS.RECIPIENT_NOT_FOUND);
  }

  if (candidate.status === TRIP_STATUS.ACCEPTED) {
    return { request: tripRequest, candidate, claimedNow: false };
  }

  if (candidate.status !== TRIP_STATUS.PENDING) {
    throw new Error(TRIP_ERRORS.NO_LONGER_AVAILABLE);
  }

  const claimed = await tripRepo.claimRecipientAcceptance({
    tripRequestId: requestId,
    userId: driverUserId,
  });

  if (!claimed) {
    throw new Error(TRIP_ERRORS.ALREADY_ACCEPTED);
  }

  return {
    request: claimed,
    candidate: findRecipientByUserId(claimed.recipients, driverUserId),
    claimedNow: true,
  };
};
