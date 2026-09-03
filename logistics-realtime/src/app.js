import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import env from "./config/env.js";
import { logger } from "./utils/logger.js";

const createApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(morgan("combined"));

  app.get("/health", async (req, res) => {
    res.json({ status: "ok", service: "logistics-realtime" });
  });

  // basic error handler
  app.use((err, req, res, next) => {
    logger.error("http:error", err.message, { stack: err.stack });
    res
      .status(err.status || 500)
      .json({ error: err.message || "internal_error" });
  });

  return app;
};

export default createApp;
