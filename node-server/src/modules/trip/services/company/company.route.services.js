import * as companyRouteRepo from "../../repositories/company/company.route.repositories.js";
import {
  TRIP_MODE,
  TRIP_STATUS,
  TRIP_STOP_STATUS,
} from "../../constants/shared/trip.constants.js";
import { formatRecipients } from "../../utils/shared/formatRecipients.js";
import { formatTripStop } from "../../utils/shared/formatTripStop.js";
import { requireTripId, requireUserId } from "../../utils/shared/requireIds.js";

export const listCompanyActiveTrips = async (userId) => {
  return companyRouteRepo.listActiveRuns(userId);
};

export const listCompanyRoutes = async (userId) => {
  return companyRouteRepo.listRoutesByUser(userId);
};

export const createCompanyTrip = async ({ body, userId }) => {
  const { recipients, stops, isDailyTrip } = body?.data ?? body;

  const companyTrip = await companyRouteRepo.createCompanyRoute({
    createdBy: userId,
    tripStopMode: TRIP_MODE.MULTI_STOP,
    status: TRIP_STATUS.WAITING_FOR_DRIVER,
    recipients: formatRecipients(recipients, userId),
    isDailyTrip: Boolean(isDailyTrip),
  });

  const formattedStops = formatTripStop(stops).map((stop) => ({
    ...stop,
    recipientsMeta: recipients.map((recipient) => ({
      recipientId: recipient.userId,
      status: TRIP_STOP_STATUS.PENDING,
      contactPerson: recipient.contactPerson || "",
      contactPhone: recipient.contactPhone || "",
      notes: recipient.notes || "",
      otp: recipient.otp || "",
      proofPhotos: [],
    })),
  }));

  await companyRouteRepo.createRouteStops({
    routeId: companyTrip._id,
    stops: formattedStops,
  });

  return companyTrip;
};

export const getCompanyTripDetails = async (tripId, userId) => {
  const trip = await companyRouteRepo.getRunDetails(
    requireTripId(tripId),
    requireUserId(userId)
  );

  return trip[0];
};
