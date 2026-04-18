import express from "express";
import { createVehicle } from "../controllers/vehicleController";

const router = express.Router();

router.post("/createVehicle/:companyId", createVehicle);

export default router;
