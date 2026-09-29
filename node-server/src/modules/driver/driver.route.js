import express from "express";
import { verifyToken } from "../../middlewares/JWT.js";
import {
  createDriver,
  getDriverDetails,
  getMyCompanyDrivers,
  onBoardingDriver,
} from "./controller/driver.controller.js";

const router = express.Router();

router.post("/create", verifyToken, createDriver);
router.post("/onboarding", onBoardingDriver);
router.get("/company", verifyToken, getMyCompanyDrivers);
router.get("/me", verifyToken, getDriverDetails);

export default router;
