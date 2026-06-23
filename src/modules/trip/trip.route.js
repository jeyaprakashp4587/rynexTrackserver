import { Router } from "express";
import { verifyToken } from "../../middlewares/JWT.js";
import {
  acceptTrip,
  getCurrentTripDetails,
  getParticularRequestedTripDetails,
  getRequestTrips,
  requestTrip,
} from "./controller/trip.controller.js";

const router = Router();
//create trip request
router.post("/requestTrip", verifyToken, requestTrip);
// get trip requests
router.get("/getRequestTrips", verifyToken, getRequestTrips);
// get particular Trip details
router.get(
  "/getParticularRequestedTripDetails/:tripId",
  verifyToken,
  getParticularRequestedTripDetails
);
// post trip acceptance
router.post("/acceptTrip", verifyToken, acceptTrip);
// get current driver trip details
router.get("/getCurrentTripDetails", verifyToken, getCurrentTripDetails);
export default router;
