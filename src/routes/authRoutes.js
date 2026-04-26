import { Router } from "express";
import { getMe, login, register } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/JWT.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", verifyToken, getMe);

export default router;
