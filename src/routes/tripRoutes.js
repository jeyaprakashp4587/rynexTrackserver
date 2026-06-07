import { Router } from "express";
import { verifyToken } from "../middlewares/JWT.js";
import {
  acceptTrip,
  createTrip,
  getRequestTrips,
  requestTrip,
} from "../controllers/tripController.js";

const router = Router();
// trip creation
router.post("/createCompanyTrip", verifyToken, createTrip);
//create trip request
router.post("/requestTrip", verifyToken, requestTrip);
// get trip requests
router.get("/getRequestTrips", verifyToken, getRequestTrips);
// post trip acceptance
router.post("/accept/:tripId", verifyToken, acceptTrip);
export default router;
