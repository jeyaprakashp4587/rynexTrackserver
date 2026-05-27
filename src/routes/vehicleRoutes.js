import express from "express";
import {
  createCompanyVehicle,
  findNearbyVehicles,
  getMyCompanyVehicles,
} from "../controllers/vehicleController.js";
import { verifyToken } from "../middlewares/JWT.js";

const router = express.Router();

router.post("/createCompanyVehicle", verifyToken, createCompanyVehicle);
router.get("/findNearbyVehicles", verifyToken, findNearbyVehicles);
router.get("/getMyCompanyVehicles", verifyToken, getMyCompanyVehicles);
export default router;
