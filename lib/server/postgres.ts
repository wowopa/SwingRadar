import { Pool } from "pg";

let pool: Pool | null = null;

export function getPostgresPool() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.SWING_RADAR_DATABASE_URL;
  if (!connectionString) {
    throw new Error("SWING_RADAR_DATABASE_URL is not configured");
  }

  pool = new Pool({
    connectionString,
    max: Number(process.env.SWING_RADAR_DB_POOL_MAX ?? 10),
    ssl: process.env.SWING_RADAR_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });

  return pool;
}