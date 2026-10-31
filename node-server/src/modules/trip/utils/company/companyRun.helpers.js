import * as runRepo from "../../repositories/company/company.run.repositories.js";
import { TRIP_FIELDS } from "../../constants/shared/trip.constants.js";
import { COMPANY_ERRORS } from "../../constants/company/company.messages.js";
import { sameId } from "./companyRoute.js";
import { buildRunStops } from "./companyRun.builders.js";
import { isActiveRunConflict, toRunConflictError } from "./companyRun.errors.js";
import { duplicateKeyFields, isDuplicateKeyError } from "../shared/mongoErrors.js";

export const findOpenRunTrip = async (tripId) => {
  const runTrip = await runRepo.findRunById(tripId);

  if (!runTrip || runTrip.isTripEnded) {
    throw new Error(COMPANY_ERRORS.RUN_TRIP_NOT_FOUND);
  }

  return runTrip;
};

export const findReplayedRun = async ({ routeId, runId, driverUserId }) => {
  if (!runId) {
    return null;
  }

  const existing = await runRepo.findRunByRunId({ routeId, runId });

  if (!existing) {
    return null;
  }

  if (!sameId(existing.recipients[0]?.userId, driverUserId)) {
    throw new Error(COMPANY_ERRORS.RUN_ID_TAKEN);
  }

  return existing;
};

export const healRunStops = async (runTrip) => {
  if (await runRepo.findRunStops(runTrip._id)) {
    return;
  }

  const template = await runRepo.findRouteTemplateStops(runTrip.companyRouteId);

  await runRepo.ensureRunStops({
    runId: runTrip._id,
    stops: buildRunStops(template.stops, runTrip.recipients[0]._id),
  });
};

export const recoverStartConflict = async (error, context) => {
  if (
    isDuplicateKeyError(error) &&
    duplicateKeyFields(error).includes(TRIP_FIELDS.RUN_ID)
  ) {
    const replay = await findReplayedRun(context);

    if (replay) {
      return replay;
    }
  }

  if (isActiveRunConflict(error)) {
    const openRun = await runRepo.findOpenRunByDriver(context.driverUserId);

    throw new Error(
      openRun ? COMPANY_ERRORS.DRIVER_HAS_OPEN_TRIP : COMPANY_ERRORS.VEHICLE_IN_USE
    );
  }

  throw toRunConflictError(error);
};
