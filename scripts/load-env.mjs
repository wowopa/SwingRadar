import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function parseEnvFile(content) {
  const entries = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    entries.push([key, value]);
  }

  return entries;
}

export function loadLocalEnv(projectRoot) {
  const envFiles = [".env.local", ".env"];

  for (const filename of envFiles) {
    const fullPath = path.join(projectRoot, filename);
    if (!existsSync(fullPath)) {
      continue;
    }

    const entries = parseEnvFile(readFileSync(fullPath, "utf8"));
    for (const [key, value] of entries) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}