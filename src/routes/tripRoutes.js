import { Router } from "express";
import { verifyToken } from "../middlewares/JWT.js";
import { createTrip, requestTrip } from "../controllers/tripController.js";

const router = Router();
// trip creation
router.post("/createCompanyTrip", verifyToken, createTrip);
export default router;
// trip request
router.post("/requestTrip", verifyToken, requestTrip);
