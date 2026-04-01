import fs from "node:fs";
import path from "node:path";

import { getRuntimePaths } from "./runtime-paths.mjs";

export function getRepoSymbolMasterPath(projectRoot) {
  return path.resolve(projectRoot, "data", "config", "symbol-master.json");
}

export function getRuntimeSymbolMasterPath(projectRoot) {
  return path.join(getRuntimePaths(projectRoot).runtimeConfigDir, "symbol-master.json");
}

export function resolveSymbolMasterInputPath(projectRoot) {
  if (process.env.SWING_RADAR_SYMBOL_MASTER_FILE) {
    return path.resolve(process.env.SWING_RADAR_SYMBOL_MASTER_FILE);
  }

  const runtimePath = getRuntimeSymbolMasterPath(projectRoot);
  if (fs.existsSync(runtimePath)) {
    return runtimePath;
  }

  return getRepoSymbolMasterPath(projectRoot);
}

export function resolveSymbolMasterOutputPath(projectRoot) {
  if (process.env.SWING_RADAR_SYMBOL_MASTER_FILE) {
    return path.resolve(process.env.SWING_RADAR_SYMBOL_MASTER_FILE);
  }

  return getRuntimeSymbolMasterPath(projectRoot);
}
