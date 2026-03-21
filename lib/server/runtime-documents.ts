import { getPostgresPool } from "@/lib/server/postgres";

export async function loadRuntimeDocument<T>(name: string): Promise<T | null> {
  if (!process.env.SWING_RADAR_DATABASE_URL) {
    return null;
  }

  const pool = getPostgresPool();

  try {
    const result = await pool.query<{ payload: T }>("select payload from runtime_documents where name = $1", [name]);
    return result.rows[0]?.payload ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/relation "runtime_documents" does not exist/i.test(message)) {
      return null;
    }

    throw error;
  }
}

export async function saveRuntimeDocument(name: string, payload: unknown) {
  if (!process.env.SWING_RADAR_DATABASE_URL) {
    return false;
  }

  const pool = getPostgresPool();
  await pool.query(
    `
    insert into runtime_documents (name, payload, updated_at)
    values ($1, $2::jsonb, now())
    on conflict (name)
    do update set payload = excluded.payload, updated_at = now()
    `,
    [name, JSON.stringify(payload)]
  );

  return true;
}
