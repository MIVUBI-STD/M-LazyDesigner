export type NativeCrypto = Pick<typeof import("node:crypto"), "createHash">;

export function normalizeProfilePath(value: string): string {
  return value
    .replace(/\//g, "\\")
    .replace(/\\+$/, "")
    .replace(/[A-Z]/g, (character) => character.toLowerCase());
}

export function profileIdentity(value: string, cryptoApi: NativeCrypto): string {
  return cryptoApi
    .createHash("sha256")
    .update(normalizeProfilePath(value), "utf8")
    .digest("hex")
    .slice(0, 32);
}
