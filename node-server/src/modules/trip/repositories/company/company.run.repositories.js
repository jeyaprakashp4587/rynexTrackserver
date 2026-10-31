import { companyRoutes } from "../../models/company/companyRoute.model.js";
import { companyRouteStops } from "../../models/company/companyRouteStops.model.js";
import { companyRun } from "../../models/company/companyRun.model.js";
import { companyRunStops } from "../../models/company/companyRunStops.model.js";
import { buildDriverCompanyRoutesPipeline } from "../../pipelines/company/company.run.pipelines.js";
import {
  TRIP_STATUS,
  TRIP_STOP_STATUS,
} from "../../constants/shared/trip.constants.js";
import { isDuplicateKeyError } from "../../utils/shared/mongoErrors.js";
import { buildStopMeta } from "../../utils/company/companyRun.builders.js";

export const findDriverCompanyRoutes = async (userId) =>
  companyRoutes.aggregate(buildDriverCompanyRoutesPipeline(userId));

export const findCompanyRouteById = async (routeId) =>
  companyRoutes.findById(routeId).lean();

export const findRouteTemplateStops = async (routeId) =>
  companyRouteStops.findOne({ routeId }).lean();

export const findRunById = async (runId) => companyRun.findById(runId).lean();

export const findRunByRunId = async ({ routeId, runId }) =>
  companyRun.findOne({ companyRouteId: routeId, runId }).lean();

export const findOpenRunByDriver = async (driverUserId) =>
  companyRun
    .findOne({ activeDriverUserId: driverUserId, isTripEnded: false })
    .lean();

export const createRun = async (payload) => {
  const [created] = await companyRun.create([payload]);
  return created.toObject();
};

export const ensureRunStops = async ({ runId, stops }) => {
  const attempt = () =>
    companyRunStops.findOneAndUpdate(
      { runId },
      { $setOnInsert: { stops } },
      { upsert: true, new: true }
    );

  try {
    return await attempt();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return attempt();
    }
    throw error;
  }
};

export const findRunStops = async (runId) =>
  companyRunStops.findOne({ runId }).lean();

export const addAssignmentMeta = async ({
  runId,
  recipientId,
  fromSequence,
}) =>
  companyRunStops.updateOne(
    { runId },
    { $push: { "stops.$[stop].recipientsMeta": buildStopMeta(recipientId) } },
    {
      arrayFilters: [
        {
          "stop.sequence": { $gte: fromSequence },
          "stop.recipientsMeta.recipientId": { $ne: recipientId },
        },
      ],
    }
  );

export const appendRunStops = async ({ runId, stopCount, stops }) =>
  companyRunStops.findOneAndUpdate(
    { runId, stops: { $size: stopCount } },
    { $push: { stops: { $each: stops } } },
    { new: true }
  );

export const updateRun = async ({ filter, update }) =>
  companyRun
    .findOneAndUpdate(filter, update, { new: true, updatePipeline: true })
    .lean();

export const findActiveAssignmentId = async ({ runId, driverUserId }) => {
  const found = await companyRun
    .findOne(
      {
        _id: runId,
        isTripEnded: false,
        activeDriverUserId: driverUserId,
        recipients: {
          $elemMatch: { userId: driverUserId, status: TRIP_STATUS.ACCEPTED },
        },
      },
      { "recipients.$": 1 }
    )
    .lean();

  return found?.recipients?.[0]?._id ?? null;
};

export const setStopStatus = async ({
  runId,
  stopSequence,
  recipientId,
  status,
  proofPhotos,
}) => {
  const now = new Date();
  const prefix = "stops.$[stop].recipientsMeta.$[meta]";
  const set = { [`${prefix}.status`]: status };

  if (proofPhotos) {
    set[`${prefix}.proofPhotos`] = proofPhotos;
  }

  if (status === TRIP_STOP_STATUS.ARRIVED) {
    set[`${prefix}.arrivedAt`] = now;
  } else if (status !== TRIP_STOP_STATUS.PENDING) {
    set[`${prefix}.completedAt`] = now;
  }

  return companyRunStops.updateOne(
    {
      runId,
      stops: {
        $elemMatch: {
          sequence: stopSequence,
          "recipientsMeta.recipientId": recipientId,
        },
      },
    },
    { $set: set },
    {
      arrayFilters: [
        { "stop.sequence": stopSequence },
        { "meta.recipientId": recipientId },
      ],
    }
  );
};

export const advanceStopIndex = async ({ runId, recipientId, stopSequence }) =>
  companyRun.updateOne(
    {
      _id: runId,
      recipients: {
        $elemMatch: { _id: recipientId, currentStopIndex: stopSequence },
      },
    },
    { $set: { "recipients.$.currentStopIndex": stopSequence + 1 } }
  );
