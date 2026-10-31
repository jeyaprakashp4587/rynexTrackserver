import { Router } from "express";
import { verifyToken } from "../../../middlewares/JWT.js";
import {
  createCompanyTrip,
  getCompanyTripDetails,
  listCompanyActiveTrips,
  listCompanyRoutes,
} from "../controller/company/company.route.controller.js";
import {
  addCompanyRunStops,
  endCompanyRun,
  getDriverCurrentCompanyRun,
  handoverCompanyRun,
  listDriverCompanyRoutes,
  startCompanyRun,
  updateCompanyRunStopProgress,
} from "../controller/company/company.run.controller.js";

const router = Router();

router.post("/company/routes", verifyToken, createCompanyTrip);
router.get("/company/routes", verifyToken, listCompanyRoutes);
router.get("/company/active", verifyToken, listCompanyActiveTrips);
router.get("/company/driver/routes", verifyToken, listDriverCompanyRoutes);
router.get("/company/driver/current", verifyToken, getDriverCurrentCompanyRun);
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
