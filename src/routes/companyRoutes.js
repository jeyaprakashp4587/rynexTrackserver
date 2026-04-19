import express from "express";
import { createCompany } from "../controllers/companyController.js";

const router = express.Router();

router.post("/createCompany", createCompany);

export default router;
