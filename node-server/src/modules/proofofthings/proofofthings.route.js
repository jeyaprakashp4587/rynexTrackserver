import { Router } from "express";
import * as proofController from "./controller/proofofthings.controller.js";

const router = Router();

router.post("/submit", proofController.submitProof);

export default router;
