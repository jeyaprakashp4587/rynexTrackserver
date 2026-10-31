import * as companyRouteService from "../../services/company/company.route.services.js";
import {
  COMPANY_FAILURES,
  COMPANY_RESPONSES,
} from "../../constants/company/company.messages.js";
import { handleRequest as handle, withData } from "../../utils/shared/handleRequest.js";

export const createCompanyTrip = handle(
  async (req) =>
    withData(
      COMPANY_RESPONSES.ROUTE_CREATED,
      await companyRouteService.createCompanyTrip({
        body: req.body,
        userId: req.userId,
      })
    ),
  { failureMessage: COMPANY_FAILURES.CREATE_ROUTE, exposeError: true }
);

export const listCompanyActiveTrips = handle(
  async (req) =>
    withData(
      COMPANY_RESPONSES.FETCHED,
      await companyRouteService.listCompanyActiveTrips(req.userId)
    ),
  { failureMessage: COMPANY_FAILURES.LIST }
);

export const listCompanyRoutes = handle(
  async (req) =>
    withData(
      COMPANY_RESPONSES.ROUTES_FETCHED,
      await companyRouteService.listCompanyRoutes(req.userId)
    ),
  { failureMessage: COMPANY_FAILURES.ROUTES, exposeError: true }
);

export const getCompanyTripDetails = handle(
  async (req) =>
    withData(
      COMPANY_RESPONSES.FETCHED_ONE,
      await companyRouteService.getCompanyTripDetails(req.params.tripId, req.userId)
    ),
  { failureMessage: COMPANY_FAILURES.GET_ONE }
);
