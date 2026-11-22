import express from "express";
import { verifyToken } from "../../middlewares/JWT.js";
import {
  changeAvailabilityStatus,
  createDriver,
  getDriverDetails,
  getMyCompanyDrivers,
  onBoardingDriver,
  changeTripStatus,
  updateActiveTrip,
  getActiveTrip,
} from "./controller/driver.controller.js";

const router = express.Router();

router.post("/create", verifyToken, createDriver);
router.post("/onboarding", onBoardingDriver);
router.get("/company", verifyToken, getMyCompanyDrivers);
router.get("/me", verifyToken, getDriverDetails);
router.get("/activeTrip", verifyToken, getActiveTrip);
router.get("/active-trip", verifyToken, getActiveTrip);
router.put("/activeTrip", verifyToken, updateActiveTrip);
router.put("/active-trip", verifyToken, updateActiveTrip);
router.put("/availableStatus", verifyToken, changeAvailabilityStatus);
router.put("/tripStatus", verifyToken, changeTripStatus);

export default router;
