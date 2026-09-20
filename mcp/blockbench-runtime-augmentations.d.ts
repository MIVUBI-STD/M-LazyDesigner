// The pinned blockbench-types baseline intentionally trails the live-validated
// Blockbench runtime. Keep narrowly verified type-only augmentations here
// instead of adding runtime fallbacks or compiler suppressions.
interface _Animation {
  getShortName(): string;
}

interface BlockbenchNativeModulePermissionOptions {
  message?: string;
  detail?: string;
  optional?: boolean;
}

declare function requireNativeModule(
  moduleName: "net",
  options?: BlockbenchNativeModulePermissionOptions
): typeof import("node:net") | undefined;


interface NullObject {
  /** Blockbench 5.2+ native IK root/source UUID. */
  ik_source?: string;
  /** Blockbench 5.2+ native IK pole UUID. */
  ik_pole?: string;
}
