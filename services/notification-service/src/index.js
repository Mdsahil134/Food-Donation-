import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { pool, initDb } from "./db.js";
import { metricsMiddleware, metricsHandler } from "./metrics.js";
import { sendMail } from "./mail.js";

const PORT = Number(process.env.PORT || 4003);
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

function requireAuth() {
  return (req, res, next) => {
    const token = authHeader(req);
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
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
  definition: { openapi: "3.0.0", info: { title: "Notifications API", version: "1.0.0" } },
  apis: [],
});

const api = express.Router();
app.use("/api/notifications/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/health", (_req, res) => res.json({ status: "ok", service: "notification" }));
app.get("/metrics", metricsHandler);

api.get("/", requireAuth(), async (req, res) => {
  const r = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [req.user.sub]
  );
  return res.json(r.rows);
});

api.patch("/:id/read", requireAuth(), async (req, res) => {
  const r = await pool.query(
    `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user.sub]
  );
  if (!r.rowCount) return res.status(404).json({ error: "Not found" });
  return res.json(r.rows[0]);
});

api.post("/internal", requireInternal, async (req, res) => {
  const { userId, title, body, type } = req.body;
  if (!userId || !title) return res.status(400).json({ error: "userId and title required" });
  const r = await pool.query(
    `INSERT INTO notifications (user_id, title, body, type) VALUES ($1,$2,$3,$4) RETURNING *`,
    [userId, title, body || "", type || "info"]
  );
  const n = r.rows[0];
  const email = req.body.email;
  if (email) {
    await sendMail({
      to: email,
      subject: title,
      text: body || "",
      html: `<p>${body || ""}</p>`,
    }).catch(() => {});
  }
  return res.status(201).json(n);
});

app.use("/api/notifications", api);

async function main() {
  await initDb();
  app.listen(PORT, "0.0.0.0", () => console.log(`notification-service listening on ${PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
