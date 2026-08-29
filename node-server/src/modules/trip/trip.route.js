import { Router } from "express";
import { verifyToken } from "../../middlewares/JWT.js";
import {
  acceptTripRequest,
  createTripRequest,
  getCompanyTripDetails,
  getDriverCurrentTripDetails,
  getTripRequestDetails,
  listCompanyActiveTrips,
  listTripRequests,
} from "./controller/trip.controller.js";

const router = Router();

router.post("/requests", verifyToken, createTripRequest);
router.get("/requests", verifyToken, listTripRequests);
router.get("/requests/:tripId", verifyToken, getTripRequestDetails);
router.post("/requests/:tripId/accept", verifyToken, acceptTripRequest);
router.get("/driver/current", verifyToken, getDriverCurrentTripDetails);
router.get("/company/active", verifyToken, listCompanyActiveTrips);
router.get("/company/:tripId", verifyToken, getCompanyTripDetails);

export default router;
