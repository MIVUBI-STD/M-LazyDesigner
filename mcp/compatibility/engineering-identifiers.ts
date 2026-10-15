/** Canonical LazyDesigner engineering identifiers.
 * Deprecated source exports are aliases to these canonical values, never a
 * fallback to retired BlockIT installation/runtime identifiers.
 */
import { LAZYDESIGNER_IDENTITY } from "./lazydesigner-identity";
export const MCP_BUNDLE_FILENAME = LAZYDESIGNER_IDENTITY.pluginFilename;
export const BUILD_ID_GLOBAL = "__LAZYDESIGNER_BUILD_ID__";
export const PLUGIN_PATH_ENV = "LAZYDESIGNER_PLUGIN_PATH";
export const MCP_URL_ENV = "LAZYDESIGNER_MCP_URL";
/** @deprecated Internal source import alias only. */
export const LEGACY_MCP_BUNDLE_FILENAME = MCP_BUNDLE_FILENAME;
/** @deprecated Internal source import alias only. */
export const LEGACY_BUILD_ID_GLOBAL = BUILD_ID_GLOBAL;
/** @deprecated Internal source import alias only. */
export const LEGACY_PLUGIN_PATH_ENV = PLUGIN_PATH_ENV;
/** @deprecated Internal source import alias only. */
export const LEGACY_MCP_URL_ENV = MCP_URL_ENV;
