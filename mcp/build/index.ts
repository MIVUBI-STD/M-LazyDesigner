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
import { version } from "../package.json";
import { LEGACY_MCP_BUNDLE_FILENAME } from "../compatibility/engineering-identifiers";

const OUTPUT_DIR = "./dist";
const entryFile = resolve("./index.ts");
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
  const mcpFile = join(OUTPUT_DIR, LEGACY_MCP_BUNDLE_FILENAME);
  const legacyMcpFile = join(OUTPUT_DIR, "mcp.js");

  if (await Bun.file(legacyMcpFile).exists()) {
    await unlink(legacyMcpFile);
    log.step(`Removed legacy ${c.gray}mcp.js${c.reset}`);
  }

  if (await Bun.file(indexFile).exists()) {
    await rename(indexFile, mcpFile);
    log.step(`Renamed ${c.gray}index.js${c.reset} → ${c.cyan}${LEGACY_MCP_BUNDLE_FILENAME}${c.reset}`);
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
  const mcpMapFile = join(OUTPUT_DIR, `${LEGACY_MCP_BUNDLE_FILENAME}.map`);

  if (await Bun.file(indexMapFile).exists()) {
    await rename(indexMapFile, mcpMapFile);
    log.step(`Renamed ${c.gray}index.js.map${c.reset} → ${c.cyan}${LEGACY_MCP_BUNDLE_FILENAME}.map${c.reset}`);
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

  if (isCleanMode) {
    await cleanOutputDir();
  }

  if (isWatchMode) {
    log.info("Building with watch mode...");
    const success = await buildPlugin();
    if (success) {
      log.success(`Initial build completed. Output in ${c.cyan}${OUTPUT_DIR}${c.reset}`);
      watchFiles();
    }
  } else {
    log.info("Building...");
    const success = await buildPlugin();
    if (success) {
      log.success(`Build completed. Output in ${c.cyan}${OUTPUT_DIR}${c.reset}`);
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
