import express from "express";
import { verifyToken } from "../../middlewares/JWT.js";
import {
  createCompanyVehicle,
  createDriverVehicleProfile,
  findNearbyVehicles,
  getMyCompanyVehicles,
} from "./controller/vehicle.controller.js";

const router = express.Router();

router.post("/company/create", verifyToken, createCompanyVehicle);
router.get("/company/list", verifyToken, getMyCompanyVehicles);
router.post("/driver/create", verifyToken, createDriverVehicleProfile);
router.get("/nearby", findNearbyVehicles);

export default router;
