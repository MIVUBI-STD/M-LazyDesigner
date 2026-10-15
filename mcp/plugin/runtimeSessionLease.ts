import { normalizeRuntimeUrl } from "@/lib/runtime/connection";
import { PRODUCT_ID } from "@/lib/product/productIdentity";
import { profileIdentity, type NativeCrypto } from "@/plugin/profileIdentity";

export type RuntimeSessionFs = Pick<
  typeof import("node:fs"),
  "mkdirSync" | "writeFileSync" | "readFileSync" | "unlinkSync"
>;

type RuntimeSessionLease = {
  schema: 2;
  product_id: typeof PRODUCT_ID;
  build_identity: string;
  profile_id: string;
  producer_pid: number;
  instance_id: string;
  runtime_url: string;
  started_at_unix_ms: number;
};

const HEARTBEAT_MS = 5_000;

/** Source-of-truth ownership for the current native lease contract.
 * A prior lease schema must not stop the new generation's heartbeat or
 * authorize deleting another Runtime's lease on shutdown. */
export function isOwnedRuntimeSessionLease(value: unknown, expectedInstanceId: string): boolean {
  if (!value || typeof value !== "object" || !expectedInstanceId) return false;
  const lease = value as Partial<RuntimeSessionLease>;
  return lease.schema === 2
    && lease.product_id === PRODUCT_ID
    && lease.instance_id === expectedInstanceId;
}
let fs: RuntimeSessionFs | null = null;
let outputPath: string | null = null;
let instanceId: string | null = null;
let leaseContents: string | null = null;
let nativeTimers: typeof import("node:timers") | null = null;
let heartbeatTimer: ReturnType<typeof import("node:timers").setInterval> | null = null;

function clearHeartbeat(): void {
  if (heartbeatTimer) nativeTimers?.clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

function currentLeaseOwned(): boolean {
  if (!fs || !outputPath || !instanceId) return false;
  try {
    const value = JSON.parse(fs.readFileSync(outputPath, "utf8")) as Partial<RuntimeSessionLease>;
    return isOwnedRuntimeSessionLease(value, instanceId);
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
  endpoint: string,
  buildIdentity: string | null
): boolean {
  stopRuntimeSessionLease();

  if (process.platform !== "win32") return true;
  // A healthy port is not proof of the installed plugin build.
  // An unverified plugin must not publish a Desktop-ready lease.
  if (!buildIdentity || !/^sha256:[a-f0-9]{64}$/.test(buildIdentity)) return false;

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
    schema: 2,
    product_id: PRODUCT_ID,
    build_identity: buildIdentity,
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
  // Renderer timers are throttled while Blockbench is minimized/backgrounded.
  nativeTimers = requireNativeModule("timers");
  heartbeatTimer = nativeTimers.setInterval(heartbeat, HEARTBEAT_MS);
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
  nativeTimers = null;
}
