import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import axios from "axios";
import { body, query, validationResult } from "express-validator";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { pool, initDb } from "./db.js";
import { metricsMiddleware, metricsHandler } from "./metrics.js";

const PORT = Number(process.env.PORT || 4002);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4003";
const TRACKING_URL = process.env.TRACKING_SERVICE_URL || "http://localhost:4004";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "internal-dev-key";

const uploadDir = process.env.UPLOAD_DIR || "/tmp/uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    cb(null, safe);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));
app.use(metricsMiddleware);
app.use("/uploads", express.static(uploadDir));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

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

async function notify(userId, title, bodyText, type = "info") {
  try {
    await axios.post(
      `${NOTIFICATION_URL}/api/notifications/internal`,
      { userId, title, body: bodyText, type },
      { headers: { "X-Internal-Key": INTERNAL_KEY }, timeout: 5000 }
    );
  } catch (e) {
    console.error("notify failed", e.message);
  }
}

async function startTrackingSession(donationId, donorId, ngoId, pickupLat, pickupLng) {
  try {
    await axios.post(
      `${TRACKING_URL}/api/tracking/sessions`,
      { donationId, donorId, ngoId, pickupLat, pickupLng },
      { headers: { "X-Internal-Key": INTERNAL_KEY }, timeout: 5000 }
    );
  } catch (e) {
    console.error("tracking session failed", e.message);
  }
}

const swaggerSpec = swaggerJsdoc({
  definition: { openapi: "3.0.0", info: { title: "Donation API", version: "1.0.0" } },
  apis: [],
});

const api = express.Router();
app.use("/api/donations/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/health", (_req, res) => res.json({ status: "ok", service: "donation" }));
app.get("/metrics", metricsHandler);

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

api.post(
  "/",
  requireAuth(["donor", "admin"]),
  upload.single("image"),
  body("foodName").trim().isLength({ min: 1 }),
  body("quantity").trim().isLength({ min: 1 }),
  body("foodType").trim().isLength({ min: 1 }),
  body("expiryAt").notEmpty().custom((v) => !Number.isNaN(Date.parse(v))).withMessage("Invalid expiry"),
  body("pickupAddress").trim().isLength({ min: 3 }),
  body("contactPhone").optional({ values: "falsy" }).trim(),
  body("lat").optional({ values: "falsy" }).isFloat({ min: -90, max: 90 }),
  body("lng").optional({ values: "falsy" }).isFloat({ min: -180, max: 180 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const expiryAt = new Date(req.body.expiryAt);
    if (expiryAt <= new Date()) return res.status(400).json({ error: "Expiry must be in the future" });
    const imagePath = req.file ? `/uploads/${path.basename(req.file.path)}` : null;
    const r = await pool.query(
      `INSERT INTO donations (donor_id, donor_name, food_name, quantity, food_type, expiry_at, pickup_address, contact_phone, lat, lng, image_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.user.sub,
        req.user.name,
        req.body.foodName,
        req.body.quantity,
        req.body.foodType,
        expiryAt.toISOString(),
        req.body.pickupAddress,
        req.body.contactPhone || null,
        req.body.lat != null ? Number(req.body.lat) : null,
        req.body.lng != null ? Number(req.body.lng) : null,
        imagePath,
      ]
    );
    const d = r.rows[0];
    await notify(req.user.sub, "Donation listed", `${d.food_name} is now live for pickup.`, "donation_created");
    return res.status(201).json(d);
  }
);

api.get("/mine", requireAuth(["donor", "admin"]), async (req, res) => {
  const r = await pool.query(`SELECT * FROM donations WHERE donor_id = $1 ORDER BY created_at DESC`, [
    req.user.sub,
  ]);
  return res.json(r.rows);
});

api.get(
  "/nearby",
  requireAuth(["ngo", "admin"]),
  query("lat").isFloat({ min: -90, max: 90 }),
  query("lng").isFloat({ min: -180, max: 180 }),
  query("radiusKm").optional().isFloat({ min: 1, max: 500 }),
  query("foodType").optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { lat, lng } = req.query;
    const radiusKm = Number(req.query.radiusKm || 50);
    const foodType = req.query.foodType;
    let q = `SELECT * FROM donations WHERE status = 'open' AND lat IS NOT NULL AND lng IS NOT NULL AND expiry_at > NOW()`;
    const params = [Number(lat), Number(lng)];
    if (foodType) {
      q += ` AND food_type ILIKE $3`;
      params.push(`%${foodType}%`);
    }
    const r = await pool.query(q, params);
    const withDist = r.rows
      .map((row) => ({
        ...row,
        distanceKm: haversineKm(Number(lat), Number(lng), row.lat, row.lng),
      }))
      .filter((row) => row.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return res.json(withDist);
});

api.get("/open", requireAuth(["ngo", "admin"]), async (_req, res) => {
  const r = await pool.query(
    `SELECT * FROM donations WHERE status = 'open' AND expiry_at > NOW() ORDER BY expiry_at ASC`
  );
  return res.json(r.rows);
});

api.get("/admin/stats", requireAuth(["admin"]), async (_req, res) => {
  const totals = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'open') AS open_count,
      COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_count,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
      COUNT(*) FILTER (WHERE status = 'expired') AS expired_count,
      COUNT(*) AS total
    FROM donations
  `);
  const byDay = await pool.query(`
    SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS c
    FROM donations
    WHERE created_at > NOW() - INTERVAL '14 days'
    GROUP BY 1 ORDER BY 1
  `);
  return res.json({ summary: totals.rows[0], donationsPerDay: byDay.rows });
});

api.get("/:id", requireAuth(), async (req, res) => {
  const r = await pool.query(`SELECT * FROM donations WHERE id = $1`, [req.params.id]);
  if (!r.rowCount) return res.status(404).json({ error: "Not found" });
  const d = r.rows[0];
  if (d.donor_id !== req.user.sub && req.user.role !== "ngo" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  return res.json(d);
});

api.post("/:id/accept", requireAuth(["ngo", "admin"]), async (req, res) => {
  const r = await pool.query(`SELECT * FROM donations WHERE id = $1`, [req.params.id]);
  if (!r.rowCount) return res.status(404).json({ error: "Not found" });
  const d = r.rows[0];
  if (d.status !== "open") return res.status(400).json({ error: "Donation not available" });
  if (new Date(d.expiry_at) <= new Date()) return res.status(400).json({ error: "Donation expired" });
  const u = await pool.query(
    `UPDATE donations SET status = 'accepted', accepted_by = $2, accepted_at = NOW() WHERE id = $1 AND status = 'open' RETURNING *`,
    [req.params.id, req.user.sub]
  );
  if (!u.rowCount) return res.status(409).json({ error: "Already taken" });
  const row = u.rows[0];
  await notify(row.donor_id, "Donation accepted", `An NGO accepted ${row.food_name}.`, "donation_accepted");
  await notify(req.user.sub, "You accepted a donation", `${row.food_name} — arrange pickup.`, "donation_accepted");
  await startTrackingSession(row.id, row.donor_id, req.user.sub, row.lat, row.lng);
  return res.json(row);
});

api.post("/:id/complete", requireAuth(["ngo", "admin"]), async (req, res) => {
  const r = await pool.query(`SELECT * FROM donations WHERE id = $1`, [req.params.id]);
  if (!r.rowCount) return res.status(404).json({ error: "Not found" });
  const d = r.rows[0];
  if (d.accepted_by !== req.user.sub && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const u = await pool.query(
    `UPDATE donations SET status = 'completed', completed_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  const row = u.rows[0];
  await notify(row.donor_id, "Pickup completed", `${row.food_name} pickup marked complete.`, "pickup_completed");
  await notify(req.user.sub, "Pickup completed", `Thanks for rescuing ${row.food_name}.`, "pickup_completed");
  return res.json(row);
});

api.delete("/:id", requireAuth(["admin"]), async (req, res) => {
  const r = await pool.query(`DELETE FROM donations WHERE id = $1 RETURNING id`, [req.params.id]);
  if (!r.rowCount) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

async function expireJob() {
  const r = await pool.query(
    `UPDATE donations SET status = 'expired' WHERE status = 'open' AND expiry_at <= NOW() RETURNING id, donor_id, food_name`
  );
  for (const row of r.rows) {
    await notify(row.donor_id, "Listing expired", `${row.food_name} was auto-expired.`, "expiry");
  }
}

app.use("/api/donations", api);

async function main() {
  await initDb();
  setInterval(expireJob, 60 * 1000);
  app.listen(PORT, "0.0.0.0", () => console.log(`donation-service listening on ${PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
