import { Router } from "express";
import { verifyToken } from "../../../middlewares/JWT.js";
import {
  acceptTripRequestForDriver,
  acceptTripRequestForOwner,
  createTripRequest,
  getDriverCurrentTripDetails,
  getTripRequestDetails,
  listTripRequests,
  rejectTripRequestForDriver,
} from "../controller/generic/trip.controller.js";

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

export default router;
