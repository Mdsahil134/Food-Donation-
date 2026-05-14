import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "foodbridge",
  password: process.env.DB_PASSWORD || "foodbridge",
  database: process.env.DB_NAME || "foodbridge_auth",
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'donor',
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      verification_token VARCHAR(128),
      reset_token VARCHAR(128),
      reset_expires TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}
