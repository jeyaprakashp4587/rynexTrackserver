import express from "express";
import { createCompany } from "../controllers/companyController.js";
import { verifyToken } from "../middlewares/JWT.js";

const router = express.Router();

router.post("/createCompany", verifyToken, createCompany);

export default router;
