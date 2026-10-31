import * as companyRunService from "../services/company.run.services.js";
import {
  COMPANY_FAILURES,
  COMPANY_RESPONSES,
} from "../constants/company.messages.js";
import { handleAction, handleRequest } from "../utils/handleRequest.js";

export const listDriverCompanyRoutes = handleRequest(
  async (req) => ({
    message: COMPANY_RESPONSES.DRIVER_ROUTES_FETCHED,
    data: await companyRunService.listDriverRoutes(req.userId),
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
