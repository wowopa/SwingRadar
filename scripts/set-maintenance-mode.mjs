import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function getMaintenanceFilePath() {
  return process.env.SWING_RADAR_MAINTENANCE_FILE
    ? path.resolve(process.env.SWING_RADAR_MAINTENANCE_FILE)
    : path.join(projectRoot, "public", "maintenance-mode.json");
}

function printHelp() {
  console.log(`
SWING-RADAR maintenance mode toggle

Usage:
  node scripts/set-maintenance-mode.mjs --on [--message <text>] [--eta-minutes <number>]
  node scripts/set-maintenance-mode.mjs --off
`);
}

function parseArgs(argv) {
  const options = {
    enabled: null,
    message: "데이터를 새로 정리하고 있습니다. 잠시 후 다시 접속해 주세요.",
    etaMinutes: null,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--on") {
      options.enabled = true;
      continue;
    }
    if (arg === "--off") {
      options.enabled = false;
      continue;
    }
    if (arg === "--message") {
      options.message = argv[index + 1] ?? options.message;
      index += 1;
      continue;
    }
    if (arg === "--eta-minutes") {
      options.etaMinutes = Number(argv[index + 1] ?? "0");
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.enabled === null) {
    printHelp();
    return;
  }

  const filePath = getMaintenanceFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify(
      {
        enabled: options.enabled,
        message: options.message,
        etaMinutes: options.enabled && Number.isFinite(options.etaMinutes) && options.etaMinutes > 0 ? options.etaMinutes : null,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`Maintenance mode ${options.enabled ? "enabled" : "disabled"}.`);
  console.log(`- file: ${filePath}`);
}

main().catch((error) => {
  console.error("Maintenance mode toggle failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
