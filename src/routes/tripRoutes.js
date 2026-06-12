import { Router } from "express";
import { verifyToken } from "../middlewares/JWT.js";
import {
  acceptTrip,
  getParticularTripDetails,
  getRequestTrips,
  requestTrip,
} from "../controllers/tripController.js";

const router = Router();
//create trip request
router.post("/requestTrip", verifyToken, requestTrip);
// get trip requests
router.get("/getRequestTrips", verifyToken, getRequestTrips);
// get particuar Trip details
router.get(
  "/getParticularTripDetails/:tripId",
  verifyToken,
  getParticularTripDetails
);
// post trip acceptance
router.post("/accept/:tripId", verifyToken, acceptTrip);
//
export default router;
