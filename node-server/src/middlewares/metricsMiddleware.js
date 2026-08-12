import {
  httpRequestDuration,
  httpRequestsTotal,
  httpErrorsTotal,
} from "../Monitoring/PrometheusMetrics.js";

export const httpMetricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();

    const durationSeconds = Number(end - start) / 1_000_000_000;

    const method = req.method;

    // Express route path
    const route = req.route?.path
      ? `${req.baseUrl || ""}${req.route.path}`
      : req.path || "unknown";

    const statusCode = String(res.statusCode);

    const labels = {
      method,
      route,
      status_code: statusCode,
    };

    // Histogram
    httpRequestDuration.observe(labels, durationSeconds);

    // Counter
    httpRequestsTotal.inc(labels);

    // 5xx errors
    if (res.statusCode >= 500) {
      httpErrorsTotal.inc(labels);
    }
  });

  next();
};
