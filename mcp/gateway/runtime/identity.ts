import { DEFAULT_RUNTIME_URL } from "../../lib/runtimeConnection";

export { DEFAULT_RUNTIME_URL };

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

export function normalizeRuntimeUrl(
  value: string = DEFAULT_RUNTIME_URL
): string {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    throw new Error(
      "LazyDesigner Runtime URL must use http or https."
    );
  }
  if (parsed.username || parsed.password) {
    throw new Error(
      "LazyDesigner Runtime URL must not contain credentials."
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname !== "127.0.0.1" &&
    hostname !== "localhost" &&
    hostname !== "::1" &&
    hostname !== "[::1]"
  ) {
    throw new Error(
      "LazyDesigner Gateway only connects to a loopback Runtime."
    );
  }

  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

export function createRuntimeSignature(health: unknown): string {
  const root = isRecord(health) ? health : {};
  const product = isRecord(root.product) ? root.product : {};

  return JSON.stringify({
    build_identity: stringValue(root.build_identity),
    instance_id: stringValue(root.instance_id),
    startup_time: stringValue(root.startup_time),
    product_id: stringValue(product.id),
    product_version: stringValue(product.version),
    profile: stringValue(product.profile),
    authoring_phase: stringValue(product.authoring_phase),
    exposed_tool_count: numberValue(root.exposed_tool_count),
  });
}
