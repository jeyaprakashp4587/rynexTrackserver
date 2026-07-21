import express from "express";
import {
  createCompany,
  getMyCompany,
} from "../controllers/companyController.js";
import { verifyToken } from "../middlewares/JWT.js";

const router = express.Router();

router.post("/createCompany", verifyToken, createCompany);
router.get("/getMyCompany", verifyToken, getMyCompany);

export default router;
