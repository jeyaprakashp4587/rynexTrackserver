import express from "express";
import { verifyToken } from "../../middlewares/JWT.js";
import {
  changeAvailabilityStatus,
  createDriver,
  getDriverDetails,
  getMyCompanyDrivers,
  onBoardingDriver,
  changeTripStatus,
} from "./controller/driver.controller.js";

const router = express.Router();

router.post("/create", verifyToken, createDriver);
router.post("/onboarding", onBoardingDriver);
router.get("/company", verifyToken, getMyCompanyDrivers);
router.get("/me", verifyToken, getDriverDetails);
router.put("/availableStatus", verifyToken, changeAvailabilityStatus);
router.put("/tripStatus", verifyToken, changeTripStatus);

export default router;
