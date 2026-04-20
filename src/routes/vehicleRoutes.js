import express from "express";
import { createCompanyVehicle } from "../controllers/vehicleController.js";

const router = express.Router();

router.post("/createVehicle/:companyId", createCompanyVehicle);

export default router;
