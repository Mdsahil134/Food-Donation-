import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { pool, initDb } from "./db.js";
import { sendMail } from "./mail.js";
import { metricsMiddleware, metricsHandler } from "./metrics.js";

const PORT = Number(process.env.PORT || 4001);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const APP_URL = process.env.APP_URL || "http://localhost";

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));
app.use(metricsMiddleware);

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

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
      if (roles && !roles.includes(payload.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "FoodBridge Auth API", version: "1.0.0" },
    servers: [{ url: "/api/auth" }],
  },
  apis: [],
});

const api = express.Router();
app.use("/api/auth/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "auth" }));
app.get("/metrics", metricsHandler);

api.post(
  "/register",
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  body("name").trim().isLength({ min: 2 }),
  body("role").optional().isIn(["donor", "ngo", "admin"]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password, name, role = "donor" } = req.body;
    if (role === "admin" && process.env.ALLOW_PUBLIC_ADMIN !== "true") {
      return res.status(403).json({ error: "Admin registration disabled" });
    }
    const hash = await bcrypt.hash(password, 12);
    const verificationToken = randomUUID();
    try {
      const r = await pool.query(
        `INSERT INTO users (email, password_hash, name, role, verification_token)
         VALUES ($1,$2,$3,$4,$5) RETURNING id, email, name, role, email_verified, created_at`,
        [email, hash, name, role, verificationToken]
      );
      const user = r.rows[0];
      const verifyLink = `${APP_URL}/verify-email?token=${verificationToken}`;
      await sendMail({
        to: email,
        subject: "Verify your FoodBridge account",
        text: `Welcome ${name}. Verify: ${verifyLink}`,
        html: `<p>Welcome ${name}.</p><p><a href="${verifyLink}">Verify email</a></p>`,
      });
      return res.status(201).json({ user: { ...user, verificationToken: process.env.NODE_ENV === "development" ? verificationToken : undefined } });
    } catch (e) {
      if (e.code === "23505") return res.status(409).json({ error: "Email already registered" });
      console.error(e);
      return res.status(500).json({ error: "Registration failed" });
    }
  }
);

api.post(
  "/login",
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const r = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = r.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!user.email_verified && process.env.REQUIRE_EMAIL_VERIFIED === "true") {
      return res.status(403).json({ error: "Email not verified" });
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.email_verified,
      },
    });
  }
);

api.post("/logout", (_req, res) => {
  res.json({ message: "Logout on client: discard token" });
});

api.get("/verify-email", async (req, res) => {
  const token = req.query.token;
  if (!token || typeof token !== "string") return res.status(400).json({ error: "token required" });
  const r = await pool.query(
    `UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id`,
    [token]
  );
  if (!r.rowCount) return res.status(400).json({ error: "Invalid token" });
  return res.json({ verified: true });
});

api.post(
  "/forgot-password",
  body("email").isEmail().normalizeEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email } = req.body;
    const resetToken = randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      `UPDATE users SET reset_token = $2, reset_expires = $3 WHERE email = $1`,
      [email, resetToken, expires]
    );
    const link = `${APP_URL}/reset-password?token=${resetToken}`;
    await sendMail({
      to: email,
      subject: "Reset your FoodBridge password",
      text: `Reset link: ${link}`,
      html: `<p><a href="${link}">Reset password</a></p>`,
    });
    return res.json({ message: "If the email exists, reset instructions were sent." });
  }
);

api.post(
  "/reset-password",
  body("token").notEmpty(),
  body("password").isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { token, password } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query(
      `UPDATE users SET password_hash = $2, reset_token = NULL, reset_expires = NULL
       WHERE reset_token = $1 AND reset_expires > NOW() RETURNING id`,
      [token, hash]
    );
    if (!r.rowCount) return res.status(400).json({ error: "Invalid or expired token" });
    return res.json({ message: "Password updated" });
  }
);

api.get("/me", requireAuth(), async (req, res) => {
  const r = await pool.query(
    `SELECT id, email, name, role, email_verified, created_at FROM users WHERE id = $1`,
    [req.user.sub]
  );
  if (!r.rowCount) return res.status(404).json({ error: "User not found" });
  return res.json(r.rows[0]);
});

api.get("/users", requireAuth(["admin"]), async (_req, res) => {
  const r = await pool.query(
    `SELECT id, email, name, role, email_verified, created_at FROM users ORDER BY created_at DESC`
  );
  return res.json(r.rows);
});

api.patch(
  "/users/:id/role",
  requireAuth(["admin"]),
  body("role").isIn(["donor", "ngo", "admin"]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const r = await pool.query(`UPDATE users SET role = $2 WHERE id = $1 RETURNING id, role`, [
      req.params.id,
      req.body.role,
    ]);
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    return res.json(r.rows[0]);
  }
);

app.use("/api/auth", api);

async function main() {
  await initDb();
  app.listen(PORT, "0.0.0.0", () => console.log(`auth-service listening on ${PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
