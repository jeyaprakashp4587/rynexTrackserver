import express from "express";
import {
  createDriver,
  getMyCompanyDrivers,
  onBoardingDriver,
} from "../controllers/driverController.js";
import { verifyToken } from "../middlewares/JWT.js";

const router = express.Router();

router.post("/createDriver", verifyToken, createDriver);
router.post("/onBoardingDriver", onBoardingDriver);
router.get("/getMyCompanyDrivers", verifyToken, getMyCompanyDrivers);
export default router;
