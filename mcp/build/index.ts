import { watch } from "node:fs";
import { createHash } from "node:crypto";
import { mkdir, copyFile, rename, rm, stat, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { log, c, isCleanMode, isProduction, isWatchMode } from "./utils";
import { blockbenchCompatPlugin, textFileLoaderPlugin } from "./plugins";
import { generatePromptManifest } from "./generate-manifest";
import {
  RUNTIME_WATCH_TARGETS,
  classifyWatchPath,
  type WatchAction,
} from "./watch-policy";
import { deployArtifact, resolveDeployTarget } from "../scripts/deploy-local";
import { version } from "../package.json";
import { DEFAULT_RUNTIME_URL } from "../lib/runtimeConnection";
import { runtimeFetch as fetch } from "../lib/runtimeFetch";

const OUTPUT_DIR = "./dist";
const entryFile = resolve("./index.ts");
const isSyncMode = Bun.argv.includes("--sync");
const localRuntimeUrl = (process.env.BLOCKIT_MCP_URL ?? DEFAULT_RUNTIME_URL).replace(/\/+$/, "");
const syncArtifactPath = resolve("./dist/blockit_mcp.js");
let syncTarget: string | null = null;

type LiveBuildProbe = {
  online: boolean;
  build_identity: string | null;
};

function syncTargetArgs(): string[] {
  const index = Bun.argv.indexOf("--sync");
  if (index < 0) return [];
  return Bun.argv.slice(index + 1).filter((arg) => arg !== "--");
}

async function probeLiveBuildIdentity(timeoutMs = 500): Promise<LiveBuildProbe> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${localRuntimeUrl}/health`, {
      headers: { connection: "close" },
      signal: controller.signal,
    });
    if (response.status !== 200) {
      return { online: false, build_identity: null };
    }
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

async function syncBuiltPlugin(target: string): Promise<void> {
  const before = await probeLiveBuildIdentity();
  try {
    const receipt = await deployArtifact(syncArtifactPath, target);
    log.step(`[Sync] deployed ${c.cyan}${receipt.target}${c.reset}`);
    log.step(`[Sync] build_identity ${c.gray}${receipt.build_identity}${c.reset}`);

    if (!before.online) {
      log.warn(
        "[Sync] DEPLOYED_OFFLINE — Blockbench Runtime is not reachable; the latest bundle will load on the next Blockbench/plugin start."
      );
      return;
    }

    const live = await waitForLiveBuildIdentity(receipt.build_identity);
    if (live.online && live.build_identity === receipt.build_identity) {
      log.success(`[Sync] LIVE_SYNCED — ${receipt.build_identity}`);
      return;
    }

    log.warn(
      `[Sync] STALE_BUILD — deployed=${receipt.build_identity}; live=${live.build_identity ?? "unavailable"}. ` +
        "If this is the first dev:sync after installing auto-sync, reload the file-based BlockIT plugin once; subsequent successful rebuilds reload automatically."
    );
  } catch (error) {
    log.error(
      `[Sync] failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function cleanOutputDir() {
  try {
    const info = await stat(OUTPUT_DIR);
    if (info.isDirectory()) {
      log.header("[Build] Clean");
      log.step(`Cleaning output directory: ${c.cyan}${OUTPUT_DIR}${c.reset}`);
      await rm(OUTPUT_DIR, { recursive: true, force: true });
    }
  } catch {
    log.dim("[Build] Output directory does not exist, no need to clean.");
  }
}

async function buildPlugin(): Promise<boolean> {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code !== "EEXIST") {
      log.header(`${c.red}[Build] Error${c.reset}`);
      log.error(`Error creating output directory: ${error}`);
      return false;
    }
  }

  const result = await Bun.build({
    entrypoints: [entryFile],
    outdir: OUTPUT_DIR,
    target: "node",
    format: "cjs",
    sourcemap: Bun.argv.includes("--sourcemap") ? "external" : "none",
    plugins: [blockbenchCompatPlugin, textFileLoaderPlugin],
    external: [
      "node:module",
      "node:fs",
      "node:fs/promises",
      "node:child_process",
      "node:https",
      "node:net",
      "node:tls",
      "node:util",
      "node:os",
      "node:v8",
      "child_process",
      "http",
      "https",
      "net",
      "tls",
      "util",
      "os",
      "v8",
    ],
    minify: isProduction,
    define: {
      "process.env.NODE_ENV": isProduction ? '"production"' : '"development"',
      __DEV__: isProduction ? "false" : "true",
    },
    drop: isProduction ? ["debugger"] : [],
  });

  if (!result.success) {
    log.header(`${c.red}[Build] Failed${c.reset}`);
    for (const message of result.logs) {
      log.error(String(message));
    }
    return false;
  }

  log.header("[Build] Assets");

  const iconSource = resolve("./icon.svg");
  const iconDest = join(OUTPUT_DIR, "icon.svg");

  if (await Bun.file(iconSource).exists()) {
    await copyFile(iconSource, iconDest);
    log.step(`Copied ${c.cyan}icon.svg${c.reset}`);
  }

  const indexFile = join(OUTPUT_DIR, "index.js");
  const mcpFile = join(OUTPUT_DIR, "blockit_mcp.js");
  const legacyMcpFile = join(OUTPUT_DIR, "mcp.js");

  if (await Bun.file(legacyMcpFile).exists()) {
    await unlink(legacyMcpFile);
    log.step(`Removed legacy ${c.gray}mcp.js${c.reset}`);
  }

  if (await Bun.file(indexFile).exists()) {
    await rename(indexFile, mcpFile);
    log.step(`Renamed ${c.gray}index.js${c.reset} → ${c.cyan}blockit_mcp.js${c.reset}`);
  }

  const mcpBunFile = Bun.file(mcpFile);
  if (!(await mcpBunFile.exists())) {
    log.error(`Expected build output was not created: ${mcpFile}`);
    return false;
  }

  const mcpContent = await mcpBunFile.text();
  const buildDigest = createHash("sha256").update(mcpContent).digest("hex");
  const buildIdentity = `sha256:${buildDigest}`;
  const banner = /* js */ `/* v${version} build ${buildDigest.slice(0, 12)} */\nglobalThis.__BLOCKIT_BUILD_ID__ = ${JSON.stringify(buildIdentity)};\nlet process = requireNativeModule('process');`;

  await Bun.write(mcpFile, banner + mcpContent);
  const emittedContent = await Bun.file(mcpFile).text();
  if (!emittedContent.startsWith(banner)) {
    log.error("Built MCP bundle is missing its build identity banner.");
    return false;
  }
  log.step(`Embedded build identity ${c.gray}${buildIdentity}${c.reset}`);

  const indexMapFile = join(OUTPUT_DIR, "index.js.map");
  const mcpMapFile = join(OUTPUT_DIR, "blockit_mcp.js.map");

  if (await Bun.file(indexMapFile).exists()) {
    await rename(indexMapFile, mcpMapFile);
    log.step(`Renamed ${c.gray}index.js.map${c.reset} → ${c.cyan}blockit_mcp.js.map${c.reset}`);
  }

  const readmeSource = resolve("./about.md");
  const readmeDest = join(OUTPUT_DIR, "about.md");

  if (await Bun.file(readmeSource).exists()) {
    await copyFile(readmeSource, readmeDest);
    log.step(`Copied ${c.cyan}about.md${c.reset}`);
  }

  return true;
}

function watchFiles() {
  log.info("[Build] Watching production runtime inputs...");

  let currentBuild: Promise<void> | null = null;
  let pendingRebuild = false;
  let pendingPromptRegeneration = false;

  async function queueRebuild(filename: string, action: Exclude<WatchAction, "ignore">) {
    pendingRebuild = true;
    if (action === "regenerate-prompts-and-rebuild") {
      pendingPromptRegeneration = true;
    }

    if (currentBuild) return;

    currentBuild = (async () => {
      while (pendingRebuild) {
        const shouldRegeneratePrompts = pendingPromptRegeneration;
        pendingRebuild = false;
        pendingPromptRegeneration = false;

        log.header(`${c.yellow}[Build] Rebuild${c.reset}`);
        log.step(`File changed: ${c.cyan}${filename}${c.reset}`);

        if (shouldRegeneratePrompts) {
          await generatePromptManifest();
        }

        await cleanOutputDir();
        const success = await buildPlugin();
        if (success) {
          log.success("Rebuild complete");
          if (syncTarget) await syncBuiltPlugin(syncTarget);
        } else {
          log.error("Rebuild failed");
        }
      }
    })();

    try {
      await currentBuild;
    } finally {
      currentBuild = null;
    }
  }

  const watchers = RUNTIME_WATCH_TARGETS.map((target) =>
    watch(target.path, { recursive: target.recursive }, (_eventType, filename) => {
      const changedPath =
        target.recursive && filename ? `${target.path}/${filename}` : target.path;
      const action = classifyWatchPath(changedPath);
      if (action === "ignore") return;
      void queueRebuild(changedPath, action);
    })
  );

  process.on("SIGINT", () => {
    for (const watcher of watchers) watcher.close();
    log.dim("[Build] Watch mode stopped");
    process.exit(0);
  });
}

async function main() {
  log.header("[Build] MCP Plugin");

  if (isSyncMode) {
    try {
      syncTarget = resolveDeployTarget(syncTargetArgs(), process.env);
      log.info(`[Sync] target ${syncTarget}`);
    } catch (error) {
      log.error(
        `[Sync] ${error instanceof Error ? error.message : String(error)} ` +
          "Set BLOCKIT_PLUGIN_PATH once (for example in your local environment) or pass the absolute blockit_mcp.js path after --sync."
      );
      process.exit(1);
      return;
    }
  }

  if (isCleanMode) {
    await cleanOutputDir();
  }

  if (isWatchMode) {
    log.info("Building with watch mode...");
    const success = await buildPlugin();
    if (success) {
      log.success(`Initial build completed. Output in ${c.cyan}${OUTPUT_DIR}${c.reset}`);
      if (syncTarget) await syncBuiltPlugin(syncTarget);
      watchFiles();
    }
  } else {
    log.info("Building...");
    const success = await buildPlugin();
    if (success) {
      log.success(`Build completed. Output in ${c.cyan}${OUTPUT_DIR}${c.reset}`);
      if (syncTarget) await syncBuiltPlugin(syncTarget);
    }
    if (!success) {
      process.exit(1);
    }
  }
}

main().catch((err) => {
  log.header(`${c.red}[Build] Fatal Error${c.reset}`);
  log.error(String(err));
  process.exit(1);
});
