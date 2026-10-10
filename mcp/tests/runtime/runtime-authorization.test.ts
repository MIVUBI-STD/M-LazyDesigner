import { expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import {
  existsSync, readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync, symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  RUNTIME_AUTH_HEADER,
  ensureRuntimeAuthorizationToken,
  readRuntimeAuthorizationToken,
  runtimeAuthorizationMatches,
  runtimeAuthorizationPath,
} from "../../lib/runtime/authorization";

test("Runtime local authorization token is outside the repository and non-overwriting", () => {
  const directory = mkdtempSync(join(tmpdir(), "lazydesigner-auth-"));
  const path = join(directory, "runtime-auth.token");
  const fs = { existsSync, readdirSync, readFileSync, writeFileSync };
  try {
    const first = ensureRuntimeAuthorizationToken(fs, { randomBytes }, path);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(readRuntimeAuthorizationToken(fs, path)).toBe(first);
    expect(ensureRuntimeAuthorizationToken(fs, { randomBytes }, path)).toBe(first);
    expect(runtimeAuthorizationMatches(first, first)).toBe(true);
    expect(runtimeAuthorizationMatches(first, "f".repeat(64))).toBe(false);
    expect(runtimeAuthorizationMatches(first, undefined)).toBe(false);
    expect(RUNTIME_AUTH_HEADER).not.toContain("blockit");
    expect(runtimeAuthorizationPath({ BLOCKIT_TLS_DIR: directory }))
      .toBe(path);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("invalid or symlinked local credentials fail closed", () => {
  const directory = mkdtempSync(join(tmpdir(), "lazydesigner-auth-deny-"));
  const path = join(directory, "runtime-auth.token");
  const target = join(directory, "untrusted.token");
  const fs = { existsSync, readdirSync, readFileSync, writeFileSync };
  try {
    writeFileSync(path, "invalid");
    expect(() => ensureRuntimeAuthorizationToken(fs, { randomBytes }, path))
      .toThrow("malformed");
    rmSync(path);
    writeFileSync(target, "b".repeat(64));
    symlinkSync(target, path);
    expect(() => readRuntimeAuthorizationToken(fs, path))
      .toThrow("not a regular file");
    expect(() => ensureRuntimeAuthorizationToken(fs, { randomBytes }, path))
      .toThrow("not a regular file");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
