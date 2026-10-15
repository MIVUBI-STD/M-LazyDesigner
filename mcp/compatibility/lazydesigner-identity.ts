/**
 * Canonical product identity for new LazyDesigner installations.
 * Legacy names are migration-detection inputs only, never executable fallback.
 * The current package pipeline must be migrated atomically before activation.
 */
export const LAZYDESIGNER_IDENTITY = Object.freeze({
  product: "LazyDesigner",
  managerExecutable: "lazydesigner.exe",
  pluginFilename: "lazydesigner_mcp.js",
  pluginId: "lazydesigner_mcp",
  packageManifest: "lazydesigner-package.json",
  releaseArchive: "lazydesigner-windows-x64.zip",
  releaseTagPrefix: "lazydesigner-v",
  clientServerKey: "lazydesigner",
  homeEnvironmentKey: "LAZYDESIGNER_HOME",
  runtimeUrlEnvironmentKey: "LAZYDESIGNER_RUNTIME_URL",
  tlsDirectoryEnvironmentKey: "LAZYDESIGNER_TLS_DIR",
  managedRootFolder: "LazyDesigner",
} as const);

export const RETIRED_BLOCKIT_IDENTIFIERS = Object.freeze({
  managerExecutable: "blockit.exe",
  pluginFilename: "blockit_mcp.js",
  pluginId: "blockit_mcp",
  packageManifest: "blockit-package.json",
  clientServerKey: "blockit",
  managedRootFolder: "BlockIT",
} as const);

export type LazyDesignerComponentIdentity = {
  product: "LazyDesigner";
  source_sha: string;
  build_identity: `sha256:${string}`;
  plugin_id: "lazydesigner_mcp";
  client_server_key: "lazydesigner";
};

export function requireMatchingLazyDesignerComponents(
  installed: LazyDesignerComponentIdentity,
  runtime: LazyDesignerComponentIdentity
): void {
  for (const candidate of [installed, runtime]) {
    if (candidate.product !== LAZYDESIGNER_IDENTITY.product ||
        candidate.plugin_id !== LAZYDESIGNER_IDENTITY.pluginId ||
        candidate.client_server_key !== LAZYDESIGNER_IDENTITY.clientServerKey ||
        !/^[a-f0-9]{40}$/.test(candidate.source_sha) ||
        !/^sha256:[a-f0-9]{64}$/.test(candidate.build_identity)) {
      throw new Error("Invalid LazyDesigner component identity.");
    }
  }
  if (installed.source_sha !== runtime.source_sha ||
      installed.build_identity !== runtime.build_identity) {
    throw new Error("LazyDesigner components belong to different builds.");
  }
}
