import { BSON_TYPE } from "../constants/trip.constants.js";
import TripStops from "../models/tripStops.model.js";
import { companyRoutes } from "../models/company.tripRoute.models.js";
import { trip } from "../models/trip.model.js";
import { buildDriverCompanyRoutesPipeline } from "../pipelines/company.run.pipelines.js";
import { isDuplicateKeyError } from "../utils/mongoErrors.js";
import { buildStopMeta } from "../utils/companyRun.builders.js";

export const findDriverCompanyRoutes = async (userId) =>
  companyRoutes.aggregate(buildDriverCompanyRoutesPipeline(userId));

export const findCompanyRouteById = async (routeId) =>
  companyRoutes.findById(routeId).lean();

export const findRouteTemplateStops = async (routeId) =>
  TripStops.findOne({ companyTripId: routeId }).lean();

export const findRunTripById = async (tripId) =>
  trip.findOne({ _id: tripId, companyRouteId: { $type: BSON_TYPE.OBJECT_ID } }).lean();

export const findRunTripByRunId = async ({ routeId, runId }) =>
  trip.findOne({ companyRouteId: routeId, runId }).lean();

export const findOpenRunTripByDriver = async (driverUserId) =>
  trip.findOne({ activeDriverUserId: driverUserId, isTripEnded: false }).lean();

export const createRunTrip = async (payload) => {
  const [created] = await trip.create([payload]);
  return created.toObject();
};

export const ensureRunStops = async ({ tripId, stops }) => {
  const attempt = () =>
    TripStops.findOneAndUpdate(
      { tripId },
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

export const findRunStops = async (tripId) =>
  TripStops.findOne({ tripId }).lean();

export const addAssignmentMeta = async ({
  tripId,
  recipientId,
  fromSequence,
}) =>
  TripStops.updateOne(
    { tripId },
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

export const appendRunStops = async ({ tripId, stopCount, stops }) =>
  TripStops.findOneAndUpdate(
    { tripId, stops: { $size: stopCount } },
    { $push: { stops: { $each: stops } } },
    { new: true }
  );

export const updateRunTrip = async ({ filter, update }) =>
  trip.findOneAndUpdate(filter, update, { new: true, updatePipeline: true }).lean();
