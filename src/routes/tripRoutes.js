import { Router } from "express";
import { verifyToken } from "../middlewares/JWT.js";
import {
  acceptTrip,
  getParticularRequestedTripDetails,
  getRequestTrips,
  requestTrip,
} from "../controllers/tripController.js";

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
router.post("/accept/:tripId", verifyToken, acceptTrip);
//
export default router;
