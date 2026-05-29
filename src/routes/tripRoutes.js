import { Router } from "express";
import { verifyToken } from "../middlewares/JWT";
import { createTrip } from "../controllers/tripController";

const router = Router();

router.post("/createCompanyTrip", verifyToken, createTrip);
export default router;
