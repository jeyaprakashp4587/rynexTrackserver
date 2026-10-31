import { MONGO_ERROR_CODES } from "../../constants/shared/trip.constants.js";

export const isDuplicateKeyError = (error) =>
  error?.code === MONGO_ERROR_CODES.DUPLICATE_KEY;

export const duplicateKeyFields = (error) =>
  Object.keys(error?.keyPattern ?? {});
