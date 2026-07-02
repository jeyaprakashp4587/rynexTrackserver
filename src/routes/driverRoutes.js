import express from "express";
import {
  createDriver,
  getDriverDetails,
  getMyCompanyDrivers,
  onBoardingDriver,
} from "../controllers/driverController.js";
import { verifyToken } from "../middlewares/JWT.js";
const router = express.Router();

router.post("/createDriver", verifyToken, createDriver);
router.post("/onBoardingDriver", onBoardingDriver);
router.get("/getMyCompanyDrivers", verifyToken, getMyCompanyDrivers);
// only for current user auth driver details
router.get("/getDriverDetails", verifyToken, getDriverDetails);
export default router;
