import { Router } from "express";
import { verifyToken } from "../middlewares/JWT.js";
import { createTrip } from "../controllers/tripController.js";

const router = Router();

router.post("/createCompanyTrip", verifyToken, createTrip);
export default router;
