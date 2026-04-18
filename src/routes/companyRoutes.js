import express from "express";
import { createCompany } from "../controllers/companyController";

const router = express.Router();

router.post("/createCompany", createCompany);

export default router;
