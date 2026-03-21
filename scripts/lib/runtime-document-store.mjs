import pg from "pg";

const { Client } = pg;

function isPersistenceEnabled() {
  return process.env.SWING_RADAR_PERSIST_OPS_REPORTS !== "false";
}

function createClient() {
  if (!process.env.SWING_RADAR_DATABASE_URL) {
    return null;
  }

  return new Client({
    connectionString: process.env.SWING_RADAR_DATABASE_URL,
    ssl: process.env.SWING_RADAR_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });
}

export async function readRuntimeDocument(name) {
  const client = createClient();
  if (!client) {
    return null;
  }

  await client.connect();

  try {
    const result = await client.query("select payload from runtime_documents where name = $1", [name]);
    return result.rows[0]?.payload ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/relation "runtime_documents" does not exist/i.test(message)) {
      return null;
    }
    throw error;
  } finally {
    await client.end();
  }
}

export async function persistRuntimeDocument(name, payload, options = {}) {
  if (!isPersistenceEnabled()) {
    return false;
  }

  const client = createClient();
  if (!client) {
    return false;
  }

  await client.connect();

  try {
    await client.query(
      `
      insert into runtime_documents (name, payload, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (name)
      do update set payload = excluded.payload, updated_at = now()
      `,
      [name, JSON.stringify(payload)]
    );
    return true;
  } catch (error) {
    const prefix = options.logPrefix ?? "runtime-document";
    console.warn(
      `[${prefix}] Failed to persist ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  } finally {
    await client.end();
  }
}
