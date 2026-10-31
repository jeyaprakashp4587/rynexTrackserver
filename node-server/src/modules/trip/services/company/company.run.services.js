import * as runRepo from "../../repositories/company/company.run.repositories.js";
import * as tripPublisher from "../../events/trip.publisher.js";
import { TERMINAL_STOP_STATUSES } from "../../constants/shared/trip.constants.js";
import { COMPANY_ROUTE_INACTIVE_STATUSES } from "../../constants/company/company.constants.js";
import {
  COMPANY_ERRORS,
  COMPANY_RESPONSES,
} from "../../constants/company/company.messages.js";
import {
  buildRunEndedData,
  buildRunHandoverData,
  buildRunStartedData,
  buildRunStopsAddedData,
} from "../../events/company.events.js";
import {
  buildActiveAssignmentFilter,
  buildEndRunUpdate,
  buildHandoverUpdate,
} from "../../pipelines/company/company.run.updates.js";
import {
  buildExtraStops,
  buildHandoverAssignment,
  buildRunAssignment,
  buildRunStops,
  buildDriverRunView,
  buildRunSummary,
  buildStartResult,
  buildRunTrip,
  hasFinishedAllStops,
  nextStopSequence,
} from "../../utils/company/companyRun.builders.js";
import { toRunConflictError } from "../../utils/company/companyRun.errors.js";
import {
  findOpenRunTrip,
  findReplayedRun,
  healRunStops,
  recoverStartConflict,
} from "../../utils/company/companyRun.helpers.js";
import {
  parseEndRun,
  parseExtraStops,
  parseHandover,
  parseStartRun,
} from "../../utils/company/companyRun.parsers.js";
import {
  findActiveAssignment,
  findStandingAssignment,
  hasAssignment,
  hasHandedOver,
  isTripOwner,
  sameId,
  wasHandedOverTo,
} from "../../utils/company/companyRoute.js";
import { clearDriverLocation, clearTripLocation } from "../../utils/shared/clearLocation.js";
import { parseStopProgress } from "../../utils/shared/parseStopProgress.js";
import { requireTripId, requireUserId } from "../../utils/shared/requireIds.js";

export const listDriverRoutes = async (userId) =>
  runRepo.findDriverCompanyRoutes(requireUserId(userId));

export const startRun = async ({ userId, params, body }) => {
  const driverUserId = requireUserId(userId);
  const { routeId, vehicleId, runId } = parseStartRun({ params, body });
  const context = { routeId, runId, driverUserId };

  const replay = await findReplayedRun(context);

  if (replay) {
    await healRunStops(replay);
    return buildStartResult(replay);
  }

  const route = await runRepo.findCompanyRouteById(routeId);

  if (!route) {
    throw new Error(COMPANY_ERRORS.ROUTE_NOT_FOUND);
  }

  if (COMPANY_ROUTE_INACTIVE_STATUSES.includes(route.status)) {
    throw new Error(COMPANY_ERRORS.ROUTE_INACTIVE);
  }

  const standing = findStandingAssignment(route.recipients, driverUserId, vehicleId);

  if (!standing) {
    throw new Error(COMPANY_ERRORS.NOT_ASSIGNED_TO_ROUTE);
  }

  const template = await runRepo.findRouteTemplateStops(routeId);

  if (!template?.stops?.length) {
    throw new Error(COMPANY_ERRORS.ROUTE_STOPS_MISSING);
  }

  const assignment = buildRunAssignment({ standing });

  let runTrip;

  try {
    runTrip = await runRepo.createRun(
      buildRunTrip({ route, assignment, runId })
    );
  } catch (error) {
    const recovered = await recoverStartConflict(error, context);

    await healRunStops(recovered);

    return buildStartResult(recovered);
  }

  await runRepo.ensureRunStops({
    runId: runTrip._id,
    stops: buildRunStops(template.stops, assignment._id),
  });

  await tripPublisher.publishTripStarted(
    buildRunStartedData({ trip: runTrip, assignment })
  );

  return buildStartResult(runTrip);
};

export const updateStopProgress = async ({ userId, tripId, body }) => {
  const driverUserId = requireUserId(userId);
  const runId = requireTripId(tripId);
  const { stopSequence, status, proofPhotos } = parseStopProgress({
    ...body,
    tripId: runId,
  });

  const recipientId = await runRepo.findActiveAssignmentId({
    runId,
    driverUserId,
  });

  if (!recipientId) {
    throw new Error(COMPANY_ERRORS.RUN_TRIP_NOT_FOUND);
  }

  const result = await runRepo.setStopStatus({
    runId,
    stopSequence,
    recipientId,
    status,
    proofPhotos,
  });

  if (!result.matchedCount) {
    throw new Error(COMPANY_ERRORS.STOP_NOT_FOUND);
  }

  if (TERMINAL_STOP_STATUSES.includes(status)) {
    await runRepo.advanceStopIndex({ runId, recipientId, stopSequence });
  }

  await tripPublisher.publishTripStopUpdated({
    tripId: runId,
    recipientId,
    stopSequence,
    status,
  });

  const runTrip = await runRepo.findRunById(runId);
  const active = runTrip && findActiveAssignment(runTrip);
  const stops = active ? await runRepo.findRunStops(runId) : null;

  return {
    message: COMPANY_RESPONSES.STOP_UPDATED,
    trip: {
      canEnd: Boolean(active) && hasFinishedAllStops(active, stops?.stops.length ?? 0),
    },
  };
};

export const endRun = async ({ userId, tripId, body }) => {
  const driverUserId = requireUserId(userId);
  const id = requireTripId(tripId);
  const { reason } = parseEndRun(body);

  const runTrip = await runRepo.findRunById(id);

  if (!runTrip || !hasAssignment(runTrip, driverUserId)) {
    throw new Error(COMPANY_ERRORS.RUN_TRIP_NOT_FOUND);
  }

  if (runTrip.isTripEnded) {
    return {
      message: COMPANY_RESPONSES.RUN_ENDED,
      trip: buildRunSummary(runTrip),
    };
  }

  const active = findActiveAssignment(runTrip);

  if (!active || !sameId(active.userId, driverUserId)) {
    throw new Error(COMPANY_ERRORS.NOT_ACTIVE_DRIVER);
  }

  const stops = await runRepo.findRunStops(id);
  const completed = hasFinishedAllStops(active, stops?.stops.length ?? 0);

  if (!completed && !reason) {
    throw new Error(COMPANY_ERRORS.END_REASON_REQUIRED);
  }

  const ended = await runRepo.updateRun({
    filter: buildActiveAssignmentFilter({
      tripId: id,
      driverUserId,
      assignmentId: active._id,
      currentStopIndex: active.currentStopIndex,
    }),
    update: buildEndRunUpdate({ assignmentId: active._id, completed, reason }),
  });

  if (!ended) {
    throw new Error(COMPANY_ERRORS.RUN_CONFLICT);
  }

  await clearTripLocation({ tripId: id, driverUserId });
  await tripPublisher.publishTripEnded(buildRunEndedData({ trip: ended, reason }));

  return {
    message: COMPANY_RESPONSES.RUN_ENDED,
    trip: buildRunSummary(ended),
  };
};

export const handoverRun = async ({ userId, tripId, body }) => {
  const actorId = requireUserId(userId);
  const id = requireTripId(tripId);
  const target = parseHandover(body);

  const runTrip = await findOpenRunTrip(id);
  const active = findActiveAssignment(runTrip);

  if (!active) {
    throw new Error(COMPANY_ERRORS.RUN_TRIP_NOT_FOUND);
  }

  const isOwner = isTripOwner(runTrip, actorId);
  const isActiveDriver = sameId(active.userId, actorId);
  const isRetryByPreviousDriver =
    hasHandedOver(runTrip, actorId) && sameId(active.userId, target.driverUserId);

  if (!isOwner && !isActiveDriver && !isRetryByPreviousDriver) {
    throw new Error(COMPANY_ERRORS.HANDOVER_NOT_ALLOWED);
  }

  if (sameId(active.userId, target.driverUserId)) {
    if (!wasHandedOverTo(runTrip, active)) {
      throw new Error(COMPANY_ERRORS.HANDOVER_SAME_DRIVER);
    }

    await runRepo.addAssignmentMeta({
      runId: id,
      recipientId: active._id,
      fromSequence: active.currentStopIndex,
    });

    return {
      message: COMPANY_RESPONSES.RUN_HANDED_OVER,
      trip: { ...buildRunSummary(runTrip), recipientId: active._id },
    };
  }

  let standing;

  if (!isOwner) {
    const route = await runRepo.findCompanyRouteById(runTrip.companyRouteId);

    if (!route) {
      throw new Error(COMPANY_ERRORS.ROUTE_NOT_FOUND);
    }

    standing = findStandingAssignment(route.recipients, target.driverUserId);

    if (!standing) {
      throw new Error(COMPANY_ERRORS.HANDOVER_TARGET_NOT_ON_ROUTE);
    }
  }

  const assignment = buildHandoverAssignment({
    previous: active,
    driverUserId: target.driverUserId,
    driverId: target.driverId ?? standing?.driverId,
  });

  let updated;

  try {
    updated = await runRepo.updateRun({
      filter: buildActiveAssignmentFilter({
        tripId: id,
        driverUserId: active.userId,
        assignmentId: active._id,
        currentStopIndex: active.currentStopIndex,
      }),
      update: buildHandoverUpdate({
        previousAssignmentId: active._id,
        assignment,
      }),
    });
  } catch (error) {
    throw toRunConflictError(error);
  }

  if (!updated) {
    throw new Error(COMPANY_ERRORS.RUN_CONFLICT);
  }

  await runRepo.addAssignmentMeta({
    runId: id,
    recipientId: assignment._id,
    fromSequence: assignment.currentStopIndex,
  });

  await clearDriverLocation(active.userId);

  await tripPublisher.publishTripHandover(
    buildRunHandoverData({ trip: updated, previous: active, assignment, actorId })
  );

  return {
    message: COMPANY_RESPONSES.RUN_HANDED_OVER,
    trip: { ...buildRunSummary(updated), recipientId: assignment._id },
  };
};

export const addExtraStops = async ({ userId, tripId, body }) => {
  const actorId = requireUserId(userId);
  const id = requireTripId(tripId);
  const formattedStops = parseExtraStops(body);

  const runTrip = await findOpenRunTrip(id);

  if (!isTripOwner(runTrip, actorId)) {
    throw new Error(COMPANY_ERRORS.EXTRA_STOPS_NOT_ALLOWED);
  }

  const current = await runRepo.findRunStops(id);

  if (!current) {
    throw new Error(COMPANY_ERRORS.RUN_TRIP_NOT_FOUND);
  }

  const stops = buildExtraStops(formattedStops, nextStopSequence(current.stops));

  const appended = await runRepo.appendRunStops({
    runId: id,
    stopCount: current.stops.length,
    stops,
  });

  if (!appended) {
    throw new Error(COMPANY_ERRORS.RUN_CONFLICT);
  }

  const fresh = await runRepo.findRunById(id);
  const active = fresh && !fresh.isTripEnded ? findActiveAssignment(fresh) : null;

  if (active) {
    await runRepo.addAssignmentMeta({
      runId: id,
      recipientId: active._id,
      fromSequence: stops[0].sequence,
    });
  }

  await tripPublisher.publishTripStopsAdded(
    buildRunStopsAddedData({ trip: runTrip, stops, actorId })
  );

  return {
    message: COMPANY_RESPONSES.STOPS_ADDED,
    trip: {
      tripId: id,
      addedSequences: stops.map(({ sequence }) => sequence),
    },
  };
};

export const getDriverCurrentRun = async (userId) => {
  const run = await runRepo.findOpenRunByDriver(requireUserId(userId));

  if (!run || !findActiveAssignment(run)) {
    return null;
  }

  return buildDriverRunView({
    run,
    runStops: await runRepo.findRunStops(run._id),
  });
};
