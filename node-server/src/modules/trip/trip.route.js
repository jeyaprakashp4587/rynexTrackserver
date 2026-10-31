import { Router } from "express";
import genericRoutes from "./routes/generic.route.js";
import companyRoutes from "./routes/company.route.js";

const router = Router();

router.use(genericRoutes);
router.use(companyRoutes);

export default router;
