import { timingSafeEqual } from "node:crypto";
import type { randomBytes as nativeRandomBytes } from "node:crypto";
import type { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { runtimeTlsPaths } from "./connection";

/**
 * This machine-local credential is distinct from the public TLS certificate.
 * It blocks uncredentialed loopback/website-origin clients, but it is not a
 * sandbox against arbitrary native code already running as the same OS user.
 */
export const RUNTIME_AUTH_HEADER = "x-lazydesigner-runtime-auth";
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

type TokenReader = {
  readFileSync: typeof readFileSync;
  lstatSync: typeof lstatSync;
};
type TokenWriter = TokenReader & { writeFileSync: typeof writeFileSync };
type TokenCrypto = { randomBytes: typeof nativeRandomBytes };

export function runtimeAuthorizationPath(
  env: Record<string, string | undefined> = process.env,
  platform: string = process.platform
): string {
  return runtimeTlsPaths(env, platform).directory + "/runtime-auth.token";
}

export function isRuntimeAuthorizationToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function readRuntimeAuthorizationToken(
  fs: TokenReader,
  path: string = runtimeAuthorizationPath()
): string {
  const state = fs.lstatSync(path);
  if (!state.isFile() || state.isSymbolicLink()) {
    throw new Error("LazyDesigner Runtime authorization credential is not a regular file.");
  }
  const value = fs.readFileSync(path, "utf8");
  if (!isRuntimeAuthorizationToken(value)) {
    throw new Error("LazyDesigner Runtime authorization credential is malformed.");
  }
  return value;
}

export function ensureRuntimeAuthorizationToken(
  fs: TokenWriter,
  crypto: TokenCrypto,
  path: string = runtimeAuthorizationPath()
): string {
  try {
    return readRuntimeAuthorizationToken(fs, path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
  }
  const value = crypto.randomBytes(32).toString("hex");
  if (!isRuntimeAuthorizationToken(value)) {
    throw new Error("Native Runtime credential generation failed.");
  }
  try {
    // Never overwrite an existing credential; POSIX owner-only mode and the
    // existing Windows TLS-directory ACL protect this machine-local secret.
    fs.writeFileSync(path, value, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
  }
  return readRuntimeAuthorizationToken(fs, path);
}

export function runtimeAuthorizationMatches(
  expected: string | null | undefined,
  provided: unknown
): boolean {
  if (!isRuntimeAuthorizationToken(expected) || !isRuntimeAuthorizationToken(provided)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
}
