import express from "express";
import { createDriver } from "../controllers/driverController.js";

const router = express.Router();

router.post("/createDriver/:companyId", createDriver);

export default router;
