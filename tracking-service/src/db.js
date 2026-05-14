import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "foodbridge",
  password: process.env.DB_PASSWORD || "foodbridge",
  database: process.env.DB_NAME || "foodbridge_tracking",
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tracking_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      donation_id UUID NOT NULL,
      donor_id UUID NOT NULL,
      ngo_id UUID NOT NULL,
      pickup_lat DOUBLE PRECISION,
      pickup_lng DOUBLE PRECISION,
      current_lat DOUBLE PRECISION,
      current_lng DOUBLE PRECISION,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tracking_donation ON tracking_sessions(donation_id);
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tracking_points (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
