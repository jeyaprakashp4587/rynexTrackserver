// import client from "prom-client";

// const register = new client.Registry();

// client.collectDefaultMetrics({
//   register,
// });

// const httpRequestDuration = new client.Histogram({
//   name: "http_request_duration_seconds",
//   help: "HTTP request duration in seconds",
//   labelNames: ["method", "route", "status_code"],
//   buckets: [0.1, 0.3, 0.5, 1, 2, 5],
// });

// register.registerMetric(httpRequestDuration);

// export { register, httpRequestDuration };

import client from "prom-client";

// Collect Node.js default metrics
client.collectDefaultMetrics({
  prefix: "logistics_",
});

// HTTP request duration
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [
    0.05, // 50ms
    0.1, // 100ms
    0.25, // 250ms
    0.5, // 500ms
    1, // 1s
    2, // 2s
    5, // 5s
    10, // 10s
  ],
});

// Total HTTP requests
export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

// HTTP errors
export const httpErrorsTotal = new client.Counter({
  name: "http_errors_total",
  help: "Total number of HTTP errors",
  labelNames: ["method", "route", "status_code"],
});

// Export Prometheus registry
export const register = client.register;
