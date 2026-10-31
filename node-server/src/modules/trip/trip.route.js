import { Router } from "express";
import { verifyToken } from "../../middlewares/JWT.js";
import {
  acceptTripRequestForDriver,
  acceptTripRequestForOwner,
  createCompanyTrip,
  createTripRequest,
  getCompanyTripDetails,
  getDriverCurrentTripDetails,
  getTripRequestDetails,
  listCompanyActiveTrips,
  listCompanyRoutes,
  listTripRequests,
  rejectTripRequestForDriver,
} from "./controller/trip.controller.js";
import {
  addCompanyRunStops,
  endCompanyRun,
  handoverCompanyRun,
  listDriverCompanyRoutes,
  startCompanyRun,
  updateCompanyRunStopProgress,
} from "./controller/company.run.controller.js";

const router = Router();

router.post("/requests", verifyToken, createTripRequest);
router.post("/requests/:requestType", verifyToken, createTripRequest);
router.get("/requests", verifyToken, listTripRequests);
router.get("/requests/:tripId", verifyToken, getTripRequestDetails);
router.post(
  "/requests/:tripId/accept-owner",
  verifyToken,
  acceptTripRequestForOwner
);
router.post(
  "/requests/:tripId/accept-driver",
  verifyToken,
  acceptTripRequestForDriver
);
router.post(
  "/requests/:tripId/reject-driver",
  verifyToken,
  rejectTripRequestForDriver
);
router.get("/driver/current", verifyToken, getDriverCurrentTripDetails);
router.post("/company/routes", verifyToken, createCompanyTrip);
router.get("/company/routes", verifyToken, listCompanyRoutes);
router.get("/company/active", verifyToken, listCompanyActiveTrips);
router.get("/company/driver/routes", verifyToken, listDriverCompanyRoutes);
router.post("/company/routes/:routeId/runs", verifyToken, startCompanyRun);
router.post("/company/trips/:tripId/end", verifyToken, endCompanyRun);
router.post("/company/trips/:tripId/handover", verifyToken, handoverCompanyRun);
router.post("/company/trips/:tripId/stops", verifyToken, addCompanyRunStops);
router.post(
  "/company/trips/:tripId/stop-progress",
  verifyToken,
  updateCompanyRunStopProgress
);
router.get("/company/:tripId", verifyToken, getCompanyTripDetails);

export default router;
