import { COMPANY_ERRORS } from "../constants/company.messages.js";
import { duplicateKeyFields, isDuplicateKeyError } from "./mongoErrors.js";

const CONFLICT_MESSAGES = {
  activeDriverUserId: COMPANY_ERRORS.DRIVER_HAS_OPEN_TRIP,
  activeVehicleId: COMPANY_ERRORS.VEHICLE_IN_USE,
};

export const toRunConflictError = (error) => {
  if (!isDuplicateKeyError(error)) {
    return error;
  }

  const field = duplicateKeyFields(error).find((name) => CONFLICT_MESSAGES[name]);

  return new Error(CONFLICT_MESSAGES[field] ?? COMPANY_ERRORS.RUN_CONFLICT);
};

const ACTIVE_RUN_FIELDS = ["activeDriverUserId", "activeVehicleId"];

export const isActiveRunConflict = (error) =>
  isDuplicateKeyError(error) &&
  duplicateKeyFields(error).some((field) => ACTIVE_RUN_FIELDS.includes(field));
