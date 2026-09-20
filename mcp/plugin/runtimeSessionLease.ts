import { normalizeRuntimeUrl } from "@/gateway/contract";
import { profileIdentity, type NativeCrypto } from "@/plugin/profileIdentity";

export type RuntimeSessionFs = Pick<
  typeof import("node:fs"),
  "mkdirSync" | "writeFileSync" | "readFileSync" | "rmSync" | "utimesSync"
>;

type RuntimeSessionLease = {
  schema: 1;
  profile_id: string;
  producer_pid: number;
  instance_id: string;
  runtime_url: string;
  started_at_unix_ms: number;
};

const HEARTBEAT_MS = 5_000;
let fs: RuntimeSessionFs | null = null;
let outputPath: string | null = null;
let instanceId: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function clearHeartbeat(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

function currentLeaseOwned(): boolean {
  if (!fs || !outputPath || !instanceId) return false;
  try {
    const value = JSON.parse(fs.readFileSync(outputPath, "utf8")) as Partial<RuntimeSessionLease>;
    return value.schema === 1 && value.instance_id === instanceId;
  } catch {
    return false;
  }
}

function heartbeat(): void {
  if (!fs || !outputPath || !instanceId) return;
  if (!currentLeaseOwned()) {
    clearHeartbeat();
    return;
  }
  try {
    const now = new Date();
    fs.utimesSync(outputPath, now, now);
  } catch {
    clearHeartbeat();
  }
}

export function startRuntimeSessionLease(
  fsApi: RuntimeSessionFs,
  cryptoApi: NativeCrypto,
  port: number,
  endpoint: string
): boolean {
  stopRuntimeSessionLease();

  if (process.platform !== "win32") return true;

  const localAppData = process.env.LOCALAPPDATA;
  const userData = typeof SystemInfo !== "undefined" ? SystemInfo.user_data_directory : "";
  if (
    !localAppData
    || !/^[A-Za-z]:[\\/]/.test(localAppData)
    || typeof userData !== "string"
    || !userData.trim()
  ) {
    return false;
  }

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let runtimeUrl: string;
  try {
    runtimeUrl = normalizeRuntimeUrl(`https://127.0.0.1:${port}${path}`);
  } catch {
    return false;
  }

  const profileId = profileIdentity(userData, cryptoApi);
  const lease: RuntimeSessionLease = {
    schema: 1,
    profile_id: profileId,
    producer_pid: process.pid,
    instance_id: globalThis.crypto.randomUUID().toLowerCase(),
    runtime_url: runtimeUrl,
    started_at_unix_ms: Date.now(),
  };

  const directory =
    localAppData.replace(/[\\/]$/, "") + "\\LazyDesigner\\runtime-session";
  const pathName = directory + "\\" + profileId + ".json";

  try {
    fsApi.mkdirSync(directory, { recursive: true });
    fsApi.writeFileSync(pathName, JSON.stringify(lease), "utf8");
  } catch {
    return false;
  }

  fs = fsApi;
  outputPath = pathName;
  instanceId = lease.instance_id;
  heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
  return true;
}

export function stopRuntimeSessionLease(): void {
  clearHeartbeat();
  if (currentLeaseOwned() && fs && outputPath) {
    try {
      fs.rmSync(outputPath, { force: true });
    } catch {
      // Freshness timeout is the crash-safe fallback.
    }
  }
  fs = null;
  outputPath = null;
  instanceId = null;
}
