import { createPrivateKey, X509Certificate } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { runtimeTlsPaths } from "../lib/runtimeConnection";

export type RuntimeTlsStatus = {
  ready: boolean;
  cert: string;
  error: string | null;
};

function validateRuntimeTlsIdentity(
  env: Record<string, string | undefined> = process.env,
  platform: string = process.platform
): RuntimeTlsStatus {
  const paths = runtimeTlsPaths(env, platform);
  if (!existsSync(paths.cert) || !existsSync(paths.key)) {
    return {
      ready: false,
      cert: paths.cert,
      error: "Runtime TLS certificate/private-key pair is missing or incomplete.",
    };
  }

  try {
    const cert = new X509Certificate(readFileSync(paths.cert));
    const key = createPrivateKey(readFileSync(paths.key));
    if (
      !cert.checkPrivateKey(key) ||
      !cert.checkIP("127.0.0.1") ||
      !cert.checkHost("localhost") ||
      Date.parse(cert.validTo) <= Date.now() ||
      Date.parse(cert.validFrom) > Date.now()
    ) {
      return {
        ready: false,
        cert: paths.cert,
        error: "Runtime TLS identity is invalid, expired, or does not match loopback.",
      };
    }
  } catch {
    return {
      ready: false,
      cert: paths.cert,
      error: "Runtime TLS identity cannot be parsed or its private key is invalid.",
    };
  }

  return { ready: true, cert: paths.cert, error: null };
}

export function runtimeTlsStatus(
  env: Record<string, string | undefined> = process.env,
  platform: string = process.platform
): RuntimeTlsStatus {
  try {
    return validateRuntimeTlsIdentity(env, platform);
  } catch (error) {
    return {
      ready: false,
      cert: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Provision once outside the checkout. Never overwrite an existing pair. */
export function ensureRuntimeTlsIdentity(
  env: Record<string, string | undefined> = process.env,
  platform: string = process.platform
): RuntimeTlsStatus {
  const paths = runtimeTlsPaths(env, platform);
  const certExists = existsSync(paths.cert);
  const keyExists = existsSync(paths.key);

  if (certExists !== keyExists) {
    throw new Error(
      "Incomplete Runtime TLS identity. Restore or explicitly remove the mismatched pair before provisioning."
    );
  }

  if (!certExists && !keyExists) {
    mkdirSync(paths.directory, { recursive: true, mode: 0o700 });
    if (platform === "win32") {
      const username = env.USERNAME;
      const domain = env.USERDOMAIN;
      if (!username || !domain) {
        throw new Error("Windows account identity is unavailable for TLS directory ACL provisioning.");
      }
      const account = `${domain}\\${username}`;
      const acl = spawnSync(
        "icacls",
        [
          paths.directory,
          "/inheritance:r",
          "/grant:r",
          `${account}:(OI)(CI)F`,
          "*S-1-5-18:(OI)(CI)F",
        ],
        { encoding: "utf8", windowsHide: true }
      );
      if (acl.status !== 0) {
        throw new Error(`Cannot restrict TLS directory permissions: ${acl.stderr}`);
      }
    } else {
      chmodSync(paths.directory, 0o700);
    }

    const gitOpenSsl = env.ProgramFiles
      ? `${env.ProgramFiles}/Git/usr/bin/openssl.exe`
      : "";
    const openssl =
      Bun.which("openssl") || (gitOpenSsl && existsSync(gitOpenSsl) ? gitOpenSsl : null);
    if (!openssl) {
      throw new Error(
        "OpenSSL is required to provision LazyDesigner Runtime TLS. Git for Windows includes a compatible OpenSSL."
      );
    }

    const result = spawnSync(
      openssl,
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-sha256",
        "-days",
        "365",
        "-subj",
        "/CN=LazyDesigner loopback Runtime",
        "-addext",
        "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1",
        "-addext",
        "basicConstraints=critical,CA:FALSE",
        "-addext",
        "extendedKeyUsage=serverAuth",
        "-keyout",
        paths.key,
        "-out",
        paths.cert,
      ],
      { encoding: "utf8", windowsHide: true, env }
    );
    if (result.status !== 0) {
      // Both files were absent before this attempt, so only this failed
      // provisioning attempt can own any partial output at these paths.
      rmSync(paths.cert, { force: true });
      rmSync(paths.key, { force: true });
      throw new Error(`TLS provisioning failed: ${result.stderr}`);
    }
    if (platform !== "win32") chmodSync(paths.key, 0o600);
  }

  const status = validateRuntimeTlsIdentity(env, platform);
  if (!status.ready) throw new Error(status.error ?? "Runtime TLS identity is not ready.");
  return status;
}
