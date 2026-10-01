import express from "express";
import { verifyToken } from "../../middlewares/JWT.js";
import {
  createCompanyVehicle,
  createDriverVehicleProfile,
  findNearbyVehicles,
  getMyCompanyVehicles,
  getMyDriverVehicles,
} from "./controller/vehicle.controller.js";
import {
  createVehicleTypeEntry,
  getVehicleTypeList,
} from "./controller/vehicleType.controller.js";

const router = express.Router();

router.post("/company/create", verifyToken, createCompanyVehicle);
router.get("/company/list", verifyToken, getMyCompanyVehicles);
router.get("/driver/list", verifyToken, getMyDriverVehicles);
router.post("/driver/create", verifyToken, createDriverVehicleProfile);
router.get("/nearby", findNearbyVehicles);
router.post("/types/create", verifyToken, createVehicleTypeEntry);
router.get("/types", verifyToken, getVehicleTypeList);

export default router;
