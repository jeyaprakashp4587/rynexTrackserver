import { TRIP_STOP_STATUS } from "../../constants/shared/trip.constants.js";
import { TRIP_ERRORS } from "../../constants/generic/trip.messages.js";
import { toObjectId } from "../shared/objectId.js";

const STOP_STATUSES = Object.values(TRIP_STOP_STATUS);

const parseProofPhotos = (podImage) => {
  if (podImage === undefined || podImage === null) {
    return undefined;
  }

  const photos = Array.isArray(podImage) ? podImage : [podImage];

  if (!photos.every((photo) => typeof photo === "string")) {
    throw new Error(TRIP_ERRORS.INVALID_PROOF_PHOTOS);
  }

  return photos;
};

export const parseStopProgress = (body) => {
  const { stopSequence, status, podImage } = body ?? {};

  if (!Number.isInteger(stopSequence) || stopSequence < 1) {
    throw new Error(TRIP_ERRORS.INVALID_STOP_SEQUENCE);
  }

  if (!STOP_STATUSES.includes(status)) {
    throw new Error(TRIP_ERRORS.INVALID_STOP_STATUS);
  }

  return {
    tripId: toObjectId(body?.tripId, TRIP_ERRORS.INVALID_TRIP_ID),
    stopSequence,
    status,
    proofPhotos: parseProofPhotos(podImage),
  };
};
