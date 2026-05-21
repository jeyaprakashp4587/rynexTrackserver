import express from "express";
import {
  createCompanyVehicle,
  findNearbyVehicles,
} from "../controllers/vehicleController.js";

const router = express.Router();

router.post("/createVehicle/:companyId", createCompanyVehicle);
router.get("/findNearbyVehicles", findNearbyVehicles);

export default router;
