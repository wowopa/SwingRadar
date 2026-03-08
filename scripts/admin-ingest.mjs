import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR Admin ingest caller

Usage:
  node scripts/admin-ingest.mjs [--apply-schema]

Env:
  SWING_RADAR_ADMIN_TOKEN   Required bearer token
  SWING_RADAR_ADMIN_URL     Optional, defaults to http://localhost:3000/api/admin/ingest
`);
}

const args = process.argv.slice(2);
if (args.includes("--help")) {
  printHelp();
  process.exit(0);
}

const applySchema = args.includes("--apply-schema");
const token = process.env.SWING_RADAR_ADMIN_TOKEN;
const url = process.env.SWING_RADAR_ADMIN_URL ?? "http://localhost:3000/api/admin/ingest";

if (!token) {
  console.error("SWING_RADAR_ADMIN_TOKEN is required");
  process.exit(1);
}

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({ applySchema })
});

const data = await response.json().catch(() => null);
console.log(JSON.stringify(data, null, 2));

if (!response.ok) {
  process.exit(1);
}