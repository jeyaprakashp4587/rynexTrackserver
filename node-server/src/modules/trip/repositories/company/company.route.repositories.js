import { companyRoutes } from "../../models/company/companyRoute.model.js";
import { companyRouteStops } from "../../models/company/companyRouteStops.model.js";
import { companyRun } from "../../models/company/companyRun.model.js";
import {
  buildCompanyActiveTripsPipeline,
  buildCompanyRoutesListPipeline,
  buildCompanyTripDetailPipeline,
} from "../../pipelines/company/company.route.pipelines.js";
import { LOG_MESSAGES } from "../../constants/shared/trip.constants.js";

export const createCompanyRoute = async (payload) => {
  const [created] = await companyRoutes.create([payload]);
  return created;
};

export const createRouteStops = async (payload) =>
  companyRouteStops.create([payload]);

export const listActiveRuns = async (userId) =>
  companyRun.aggregate(buildCompanyActiveTripsPipeline(userId));

export const listRoutesByUser = async (userId) =>
  companyRoutes.aggregate(buildCompanyRoutesListPipeline(userId));

export const getRunDetails = async (runId, userId) => {
  try {
    return await companyRun.aggregate(
      buildCompanyTripDetailPipeline(runId, userId)
    );
  } catch (error) {
    console.error(LOG_MESSAGES.COMPANY_DETAILS_FAILED, error);
    throw error;
  }
};
