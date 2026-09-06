import { Router } from "express";
import * as invoiceController from "./controller/invoice.controller.js";

const router = Router();

router.post("/create", invoiceController.createInvoice);

export default router;
