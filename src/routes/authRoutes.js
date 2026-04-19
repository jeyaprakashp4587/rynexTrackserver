import { Router } from "express";
import {
  getMe,
  login,
  registerCompany,
} from "../controllers/authController.js";
import { verifyToken } from "../middlewares/JWT.js";

const router = Router();

router.post("/login", login);
router.post("/register", registerCompany);
router.get("/me", verifyToken, getMe);

export default router;
