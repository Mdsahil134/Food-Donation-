import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "foodbridge",
  password: process.env.DB_PASSWORD || "foodbridge",
  database: process.env.DB_NAME || "foodbridge_donation",
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS donations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      donor_id UUID NOT NULL,
      donor_name VARCHAR(255),
      food_name VARCHAR(255) NOT NULL,
      quantity VARCHAR(64) NOT NULL,
      food_type VARCHAR(64) NOT NULL,
      expiry_at TIMESTAMPTZ NOT NULL,
      pickup_address TEXT NOT NULL,
      contact_phone VARCHAR(64),
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      image_path VARCHAR(512),
      status VARCHAR(32) NOT NULL DEFAULT 'open',
      accepted_by UUID,
      accepted_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
    CREATE INDEX IF NOT EXISTS idx_donations_expiry ON donations(expiry_at);
    CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
  `);
}
