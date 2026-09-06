import cors from "cors";
import express from "express";
import authRoutes from "./modules/auth/auth.route.js";
import vehicleRoutes from "./modules/vehicle/vehicle.route.js";
import companyRoutes from "./modules/company/company.route.js";
import driverRoutes from "./modules/driver/driver.route.js";
import tripRoutes from "./modules/trip/trip.route.js";
import notificationRoutes from "./modules/notifications/notification.route.js";
import invoiceRoutes from "./modules/invoices/invoice.route.js";
import proofRoutes from "./modules/proofofthings/proofofthings.route.js";
import bodyParser from "body-parser";
import { register } from "./Monitoring/PrometheusMetrics.js";
import { httpMetricsMiddleware } from "./middlewares/metricsMiddleware.js";

const app = express();
// promclient.collectDefaultMetrics({ timeout: 5000 });

app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// middleware for prometheus metrics endpoint
app.use(httpMetricsMiddleware);
app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Rynex Track API is healthy",
  });
});

// api uses
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/proofs", proofRoutes);

export default app;
