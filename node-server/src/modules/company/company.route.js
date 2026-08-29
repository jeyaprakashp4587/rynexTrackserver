import express from "express";
import { verifyToken } from "../../middlewares/JWT.js";
import {
  createCompany,
  getMyCompany,
} from "./controller/company.controller.js";

const router = express.Router();

router.post("/create", verifyToken, createCompany);
router.get("/profile", verifyToken, getMyCompany);

export default router;
