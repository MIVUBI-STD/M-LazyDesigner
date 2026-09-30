import { copyFile, rename, rm, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { LEGACY_PLUGIN_PATH_ENV } from "../../compatibility/engineering-identifiers";
import {
  extractLegacyMcpBuildIdentity,
  LEGACY_MCP_BUNDLE_FILENAME,
} from "../../compatibility/build-artifact";

const EXPECTED_PLUGIN_FILENAME = LEGACY_MCP_BUNDLE_FILENAME;
const DEFAULT_ARTIFACT_PATH = resolve(import.meta.dir, "../../dist", LEGACY_MCP_BUNDLE_FILENAME);

export function resolveDeployTarget(
  args: string[],
  env: Record<string, string | undefined> = process.env
): string {
  const positional = args.filter((arg) => arg !== "--");
  if (positional.length > 1) {
    throw new Error(
      `Local deploy accepts exactly one destination path. Pass it as the only argument or set ${LEGACY_PLUGIN_PATH_ENV}.`
    );
  }

  const rawTarget = positional[0] ?? env[LEGACY_PLUGIN_PATH_ENV];
  if (!rawTarget) {
    throw new Error(
      `Missing local Blockbench plugin destination. Pass an absolute path ending in ${EXPECTED_PLUGIN_FILENAME} or set ${LEGACY_PLUGIN_PATH_ENV}.`
    );
  }
  if (!isAbsolute(rawTarget)) {
    throw new Error("Local deploy destination must be an absolute filesystem path.");
  }
  if (basename(rawTarget) !== EXPECTED_PLUGIN_FILENAME) {
    throw new Error(
      `Local deploy destination must end in ${EXPECTED_PLUGIN_FILENAME} so the installed filename matches the stable plugin ID.`
    );
  }

  return resolve(rawTarget);
}

export const extractBuildIdentity = extractLegacyMcpBuildIdentity;

export async function deployArtifact(
  sourcePath: string,
  targetPath: string
): Promise<{ target: string; build_identity: string }> {
  const source = resolve(sourcePath);
  const target = resolve(targetPath);

  if (source === target) {
    throw new Error("Local deploy destination must differ from the build artifact path.");
  }

  const sourceFile = Bun.file(source);
  if (!(await sourceFile.exists())) {
    throw new Error(`Built plugin does not exist: ${source}`);
  }

  const sourceContent = await sourceFile.text();
  const buildIdentity = extractBuildIdentity(sourceContent);

  let parentInfo;
  try {
    parentInfo = await stat(dirname(target));
  } catch {
    throw new Error(`Local deploy destination directory does not exist: ${dirname(target)}`);
  }
  if (!parentInfo.isDirectory()) {
    throw new Error(`Local deploy destination parent is not a directory: ${dirname(target)}`);
  }

  // Never stream new bytes directly into the file Blockbench is watching.
  // Stage and verify exact bytes first, then perform one filesystem rename so
  // dev:sync can only observe the previous complete bundle or the next one.
  const stagedTarget = `${target}.next-${process.pid}`;
  await rm(stagedTarget, { force: true });

  try {
    await copyFile(source, stagedTarget);
    const stagedContent = await Bun.file(stagedTarget).text();
    if (stagedContent !== sourceContent) {
      throw new Error(
        "Local deploy staging verification failed: staged plugin bytes differ from the built artifact."
      );
    }
    if (extractBuildIdentity(stagedContent) !== buildIdentity) {
      throw new Error(
        "Local deploy staging verification failed: build_identity changed during staging."
      );
    }

    await rename(stagedTarget, target);
  } catch (error) {
    await rm(stagedTarget, { force: true });
    throw error;
  }

  const deployedContent = await Bun.file(target).text();
  if (deployedContent !== sourceContent) {
    throw new Error("Local deploy verification failed: installed plugin bytes differ from the built artifact.");
  }
  if (extractBuildIdentity(deployedContent) !== buildIdentity) {
    throw new Error("Local deploy verification failed: installed build_identity changed during atomic replacement.");
  }

  return { target, build_identity: buildIdentity };
}

async function main(): Promise<void> {
  const target = resolveDeployTarget(Bun.argv.slice(2));
  const receipt = await deployArtifact(DEFAULT_ARTIFACT_PATH, target);

  console.log("LazyDesigner local plugin deployed.");
  console.log(`target: ${receipt.target}`);
  console.log(`build_identity: ${receipt.build_identity}`);
  console.log(
    "Reload Blockbench/LazyDesigner, reconnect, then run the relevant live verifier. Its shared preflight owns freshness/runtime checks; use verify:stateless-local only for diagnosis when that preflight fails."
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`Local deploy failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}