import os from "os";
import path from "path";

function getDefaultRuntimeRoot() {
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    return path.resolve(localAppData, "SwingRadar", "runtime");
  }

  return path.resolve(os.homedir(), ".swing-radar", "runtime");
}

export function getRuntimeRoot() {
  return process.env.SWING_RADAR_RUNTIME_ROOT
    ? path.resolve(process.env.SWING_RADAR_RUNTIME_ROOT)
    : getDefaultRuntimeRoot();
}

export function getRuntimePaths(projectRoot = process.cwd()) {
  const runtimeRoot = getRuntimeRoot();
  const repoDataRoot = path.resolve(projectRoot, "data");

  return {
    runtimeRoot,
    repoDataRoot,
    configDir: path.join(repoDataRoot, "config"),
    rawDir: path.join(runtimeRoot, "raw"),
    liveDir: path.join(runtimeRoot, "live"),
    liveSnapshotRoot: path.join(runtimeRoot, "live-snapshots"),
    opsDir: path.join(runtimeRoot, "ops"),
    universeDir: path.join(runtimeRoot, "universe"),
    trackingDir: path.join(runtimeRoot, "tracking"),
    historyDir: path.join(runtimeRoot, "history"),
    adminDir: path.join(runtimeRoot, "admin"),
    usersDir: path.join(runtimeRoot, "users"),
    runtimeConfigDir: path.join(runtimeRoot, "config")
  };
}
