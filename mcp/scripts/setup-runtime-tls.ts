import { existsSync, mkdirSync, chmodSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { X509Certificate, createPrivateKey } from "node:crypto";
import { runtimeTlsPaths } from "../lib/runtimeConnection";

/** Provision once, outside the checkout. Never overwrite an existing identity. */
export function setupRuntimeTls(): string {
  const paths = runtimeTlsPaths();
  if (!existsSync(paths.cert) && !existsSync(paths.key)) {
    mkdirSync(paths.directory, { recursive: true, mode: 0o700 });
    if (process.platform === "win32") {
      const account = `${process.env.USERDOMAIN}\\${process.env.USERNAME}`;
      const acl = spawnSync("icacls", [paths.directory, "/inheritance:r", "/grant:r",
        `${account}:(OI)(CI)F`, "*S-1-5-18:(OI)(CI)F"], { encoding: "utf8", windowsHide: true });
      if (acl.status !== 0) throw new Error(`Cannot restrict TLS directory permissions: ${acl.stderr}`);
    } else {
      chmodSync(paths.directory, 0o700);
    }
    const gitOpenSsl = `${process.env.ProgramFiles}/Git/usr/bin/openssl.exe`;
    const openssl = Bun.which("openssl") ?? (existsSync(gitOpenSsl) ? gitOpenSsl : null);
    if (!openssl) throw new Error("OpenSSL is required to provision Runtime TLS (Git for Windows includes it).");
    const result = spawnSync(openssl, ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
      "-sha256", "-days", "365", "-subj", "/CN=LazyDesigner loopback Runtime",
      "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1",
      "-addext", "basicConstraints=critical,CA:FALSE",
      "-addext", "extendedKeyUsage=serverAuth",
      "-keyout", paths.key, "-out", paths.cert], { encoding: "utf8", windowsHide: true });
    if (result.status !== 0) throw new Error(`TLS provisioning failed: ${result.stderr}`);
    if (process.platform !== "win32") chmodSync(paths.key, 0o600);
  }
  if (!existsSync(paths.cert) || !existsSync(paths.key)) {
    throw new Error("Incomplete Runtime TLS identity. Restore the matching certificate/key; setup will not overwrite it.");
  }
  const cert = new X509Certificate(readFileSync(paths.cert));
  if (!cert.checkPrivateKey(createPrivateKey(readFileSync(paths.key))) ||
      !cert.checkIP("127.0.0.1") || !cert.checkHost("localhost") ||
      Date.parse(cert.validTo) <= Date.now() || Date.parse(cert.validFrom) > Date.now()) {
    throw new Error("Runtime TLS identity is invalid or expired; explicitly replace the pair before provisioning again.");
  }
  return paths.cert;
}

if (import.meta.main) console.log(`Runtime TLS ready: ${setupRuntimeTls()}`);
