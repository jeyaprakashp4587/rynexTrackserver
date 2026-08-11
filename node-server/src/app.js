import cors from "cors";
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import tripRoutes from "./modules/trip/trip.route.js";
import bodyParser from "body-parser";
// import promclient from "prom-client";
import { register } from "./Monitoring/PrometheusMetrics.js";

const app = express();
// promclient.collectDefaultMetrics({ timeout: 5000 });

app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

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

export default app;
