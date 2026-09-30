import { watch } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { deployArtifact, resolveDeployTarget } from "./deploy-local";
import { DEFAULT_RUNTIME_URL } from "../../lib/runtimeConnection";
import { runtimeFetch as fetch } from "../../lib/runtimeFetch";
import {
  LEGACY_MCP_BUNDLE_FILENAME,
  LEGACY_MCP_URL_ENV,
} from "../../compatibility/engineering-identifiers";

const ARTIFACT_PATH = resolve(import.meta.dir, "../../dist", LEGACY_MCP_BUNDLE_FILENAME);
const localRuntimeUrl = (process.env[LEGACY_MCP_URL_ENV] ?? DEFAULT_RUNTIME_URL).replace(/\/+$/, "");

type LiveBuildProbe = {
  online: boolean;
  build_identity: string | null;
};

async function probeLiveBuildIdentity(timeoutMs = 500): Promise<LiveBuildProbe> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${localRuntimeUrl}/health`, {
      headers: { connection: "close" },
      signal: controller.signal,
    });
    if (response.status !== 200) return { online: false, build_identity: null };
    const body = (await response.json()) as { build_identity?: unknown };
    return {
      online: true,
      build_identity:
        typeof body.build_identity === "string" ? body.build_identity : null,
    };
  } catch {
    return { online: false, build_identity: null };
  } finally {
    clearTimeout(timer);
  }
}

async function waitForLiveBuildIdentity(
  expected: string,
  timeoutMs = 5_000
): Promise<LiveBuildProbe> {
  const deadline = Date.now() + timeoutMs;
  let latest: LiveBuildProbe = { online: false, build_identity: null };
  while (Date.now() < deadline) {
    latest = await probeLiveBuildIdentity();
    if (latest.online && latest.build_identity === expected) return latest;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  return latest;
}

async function syncArtifact(target: string): Promise<void> {
  const before = await probeLiveBuildIdentity();
  const receipt = await deployArtifact(ARTIFACT_PATH, target);

  console.log(`[Dev Sync] deployed ${receipt.target}`);
  console.log(`[Dev Sync] build_identity ${receipt.build_identity}`);

  if (!before.online) {
    console.log(
      "[Dev Sync] DEPLOYED_OFFLINE — Runtime is not reachable; the bundle will load on the next Blockbench/plugin start."
    );
    return;
  }

  const live = await waitForLiveBuildIdentity(receipt.build_identity);
  if (live.online && live.build_identity === receipt.build_identity) {
    console.log(`[Dev Sync] LIVE_SYNCED — ${receipt.build_identity}`);
    return;
  }

  console.warn(
    `[Dev Sync] STALE_BUILD — deployed=${receipt.build_identity}; live=${live.build_identity ?? "unavailable"}`
  );
}

async function main(): Promise<void> {
  const target = resolveDeployTarget(Bun.argv.slice(2), process.env);
  await mkdir(resolve(import.meta.dir, "../../dist"), { recursive: true });
  let syncing: Promise<void> | null = null;
  let pending = false;

  const queueSync = () => {
    pending = true;
    if (syncing) return;

    syncing = (async () => {
      while (pending) {
        pending = false;
        try {
          if (await Bun.file(ARTIFACT_PATH).exists()) {
            await syncArtifact(target);
          }
        } catch (error) {
          console.error(
            `[Dev Sync] failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    })().finally(() => {
      syncing = null;
      if (pending) queueSync();
    });
  };

  const builder = spawn(
    process.platform === "win32" ? "bun.exe" : "bun",
    ["run", "dev:watch"],
    { cwd: resolve(import.meta.dir, "../.."), stdio: "inherit", env: process.env }
  );

  const watcher = watch(resolve(import.meta.dir, "../../dist"), { persistent: true }, (_event, filename) => {
    if (filename === LEGACY_MCP_BUNDLE_FILENAME) queueSync();
  });

  const stop = () => {
    watcher.close();
    builder.kill();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  builder.on("exit", (code) => {
    watcher.close();
    process.exit(code ?? 0);
  });

  console.log(`[Dev Sync] target ${target}`);
}

main().catch((error) => {
  console.error(`Dev sync failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
