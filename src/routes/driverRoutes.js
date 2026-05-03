import express from "express";
import {
  createDriver,
  onBoardingDriver,
} from "../controllers/driverController.js";

const router = express.Router();

router.post("/createDriver/:companyId", createDriver);
router.post("/onBoardingDriver", onBoardingDriver);

export default router;
