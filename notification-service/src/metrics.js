import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: "notification_http_request_duration_seconds",
  help: "HTTP request duration",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path || req.path || "unknown";
    httpRequestDuration.labels(req.method, route, String(res.statusCode)).observe(duration);
  });
  next();
}

export async function metricsHandler(_req, res) {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
}
