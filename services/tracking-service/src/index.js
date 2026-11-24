import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { pool, initDb } from "./db.js";
import { metricsMiddleware, metricsHandler, haversineKm } from "./metrics.js";

const PORT = Number(process.env.PORT || 4004);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "internal-dev-key";

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || true, credentials: true }));
app.use(express.json());
app.use(morgan("combined"));
app.use(metricsMiddleware);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 400 }));

function authHeader(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}

function requireAuth(roles) {
  return (req, res, next) => {
    const token = authHeader(req);
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (roles && !roles.includes(payload.role)) return res.status(403).json({ error: "Forbidden" });
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

function requireInternal(req, res, next) {
  if (req.headers["x-internal-key"] !== INTERNAL_KEY) return res.status(403).json({ error: "Forbidden" });
  next();
}

const swaggerSpec = swaggerJsdoc({
  definition: { openapi: "3.0.0", info: { title: "Tracking API", version: "1.0.0" } },
  apis: [],
});

const api = express.Router();
app.use("/api/tracking/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/health", (_req, res) => res.json({ status: "ok", service: "tracking" }));
app.get("/metrics", metricsHandler);

api.post(
  "/sessions",
  requireInternal,
  body("donationId").isUUID(),
  body("donorId").isUUID(),
  body("ngoId").isUUID(),
  body("pickupLat").optional().isFloat(),
  body("pickupLng").optional().isFloat(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const r = await pool.query(
      `INSERT INTO tracking_sessions (donation_id, donor_id, ngo_id, pickup_lat, pickup_lng, current_lat, current_lng)
       VALUES ($1,$2,$3,$4,$5,$4,$5) RETURNING *`,
      [
        req.body.donationId,
        req.body.donorId,
        req.body.ngoId,
        req.body.pickupLat ?? null,
        req.body.pickupLng ?? null,
      ]
    );
    return res.status(201).json(r.rows[0]);
  }
);

api.get("/sessions/by-donation/:donationId", requireAuth(), async (req, res) => {
  const r = await pool.query(`SELECT * FROM tracking_sessions WHERE donation_id = $1 ORDER BY created_at DESC LIMIT 1`, [
    req.params.donationId,
  ]);
  if (!r.rowCount) return res.status(404).json({ error: "Not found" });
  const s = r.rows[0];
  if (s.donor_id !== req.user.sub && s.ngo_id !== req.user.sub && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  let distanceToPickupKm = null;
  if (s.pickup_lat != null && s.pickup_lng != null && s.current_lat != null && s.current_lng != null) {
    distanceToPickupKm = haversineKm(s.current_lat, s.current_lng, s.pickup_lat, s.pickup_lng);
  }
  const pts = await pool.query(
    `SELECT lat, lng, recorded_at FROM tracking_points WHERE session_id = $1 ORDER BY recorded_at ASC`,
    [s.id]
  );
  return res.json({ session: s, distanceToPickupKm, route: pts.rows });
});

api.post(
  "/sessions/:id/location",
  requireAuth(["ngo", "admin"]),
  body("lat").isFloat({ min: -90, max: 90 }),
  body("lng").isFloat({ min: -180, max: 180 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const s = await pool.query(`SELECT * FROM tracking_sessions WHERE id = $1`, [req.params.id]);
    if (!s.rowCount) return res.status(404).json({ error: "Not found" });
    const row = s.rows[0];
    if (row.ngo_id !== req.user.sub && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    await pool.query(
      `UPDATE tracking_sessions SET current_lat = $2, current_lng = $3, updated_at = NOW() WHERE id = $1`,
      [req.params.id, req.body.lat, req.body.lng]
    );
    await pool.query(`INSERT INTO tracking_points (session_id, lat, lng) VALUES ($1,$2,$3)`, [
      req.params.id,
      req.body.lat,
      req.body.lng,
    ]);
    const u = await pool.query(`SELECT * FROM tracking_sessions WHERE id = $1`, [req.params.id]);
    return res.json(u.rows[0]);
  }
);

api.post("/distance", requireAuth(), (req, res) => {
  const { fromLat, fromLng, toLat, toLng } = req.body;
  if ([fromLat, fromLng, toLat, toLng].some((x) => x == null || Number.isNaN(Number(x)))) {
    return res.status(400).json({ error: "fromLat, fromLng, toLat, toLng required" });
  }
  const km = haversineKm(Number(fromLat), Number(fromLng), Number(toLat), Number(toLng));
  return res.json({ distanceKm: km });
});

app.use("/api/tracking", api);

async function main() {
  await initDb();
  app.listen(PORT, "0.0.0.0", () => console.log(`tracking-service listening on ${PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
