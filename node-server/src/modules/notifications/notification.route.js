import { Router } from "express";
import * as notificationController from "./controller/notification.controller.js";

const router = Router();

router.post("/send", notificationController.sendNotification);

export default router;
