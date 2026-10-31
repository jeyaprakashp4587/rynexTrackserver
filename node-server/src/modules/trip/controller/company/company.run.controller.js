import * as companyRunService from "../../services/company/company.run.services.js";
import {
  COMPANY_FAILURES,
  COMPANY_RESPONSES,
} from "../../constants/company/company.messages.js";
import { handleAction, handleRequest } from "../../utils/shared/handleRequest.js";

export const listDriverCompanyRoutes = handleRequest(
  async (req) => ({
    message: COMPANY_RESPONSES.DRIVER_ROUTES_FETCHED,
    data: await companyRunService.listDriverRoutes(
      req.userId,
      req.query?.vehicleId
    ),
  }),
  { failureMessage: COMPANY_FAILURES.DRIVER_ROUTES }
);

export const startCompanyRun = handleAction((req) =>
  companyRunService.startRun({
    userId: req.userId,
    params: req.params,
    body: req.body,
  }),
  COMPANY_FAILURES.ACTION
);

export const endCompanyRun = handleAction((req) =>
  companyRunService.endRun({
    userId: req.userId,
    tripId: req.params.tripId,
    body: req.body,
  }),
  COMPANY_FAILURES.ACTION
);

export const handoverCompanyRun = handleAction((req) =>
  companyRunService.handoverRun({
    userId: req.userId,
    tripId: req.params.tripId,
    body: req.body,
  }),
  COMPANY_FAILURES.ACTION
);

export const addCompanyRunStops = handleAction((req) =>
  companyRunService.addExtraStops({
    userId: req.userId,
    tripId: req.params.tripId,
    body: req.body,
  }),
  COMPANY_FAILURES.ACTION
);

export const updateCompanyRunStopProgress = handleAction((req) =>
  companyRunService.updateStopProgress({
    userId: req.userId,
    tripId: req.params.tripId,
    body: req.body,
  }),
  COMPANY_FAILURES.ACTION
);

export const getDriverCurrentCompanyRun = handleRequest(
  async (req) => ({
    message: COMPANY_RESPONSES.FETCHED_ONE,
    data: await companyRunService.getDriverCurrentRun(req.userId),
  }),
  { failureMessage: COMPANY_FAILURES.GET_ONE }
);
