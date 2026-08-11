import { httpRequestDuration } from "../Monitoring/PrometheusMetrics";

app.use((req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);

    const duration = diff[0] + diff[1] / 1e9;

    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });

  next();
});
