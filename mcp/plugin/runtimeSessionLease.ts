import { normalizeRuntimeUrl } from "@/lib/runtime/connection";
import { profileIdentity, type NativeCrypto } from "@/plugin/profileIdentity";

export type RuntimeSessionFs = Pick<
  typeof import("node:fs"),
  "mkdirSync" | "writeFileSync" | "readFileSync" | "unlinkSync"
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
let leaseContents: string | null = null;
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
  if (!fs || !outputPath || !instanceId || !leaseContents) return;
  if (!currentLeaseOwned()) {
    clearHeartbeat();
    return;
  }
  try {
    // Blockbench's permission-scoped FS does not expose utimesSync.
    fs.writeFileSync(outputPath, leaseContents, "utf8");
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

  const contents = JSON.stringify(lease);
  try {
    fsApi.mkdirSync(directory, { recursive: true });
    fsApi.writeFileSync(pathName, contents, "utf8");
  } catch {
    return false;
  }

  fs = fsApi;
  outputPath = pathName;
  instanceId = lease.instance_id;
  leaseContents = contents;
  heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
  return true;
}

export function stopRuntimeSessionLease(): void {
  clearHeartbeat();
  if (currentLeaseOwned() && fs && outputPath) {
    try {
      // Scoped rmSync in Blockbench 5.2 invokes async rm without a callback.
      fs.unlinkSync(outputPath);
    } catch {
      // Freshness timeout is the crash-safe fallback.
    }
  }
  fs = null;
  outputPath = null;
  instanceId = null;
  leaseContents = null;
}
