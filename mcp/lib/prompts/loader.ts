import bundledPromptManifest from "@/prompts/manifest.json";
import { z } from "zod";
import { assertBedrockWorkflowSourceCompatible } from "./contract";

export interface PromptManifest {
  version: string;
  prompts: Record<string, string>;
}

const STORAGE_KEY_OVERRIDES = "bbmcp_prompt_overrides";
const PROMPT_OVERRIDE_STORE_VERSION = 2;

const promptManifestSchema = z.object({
  version: z.string(),
  prompts: z.record(z.string(), z.string()),
});

const promptOverrideEntrySchema = z.object({
  base_fingerprint: z.string(),
  content: z.string(),
});

const promptOverrideStoreSchema = z.object({
  schema_version: z.literal(PROMPT_OVERRIDE_STORE_VERSION),
  overrides: z.record(z.string(), promptOverrideEntrySchema),
});

const localManifest: PromptManifest = promptManifestSchema.parse(
  bundledPromptManifest
);

let overrides: Record<string, string> = {};
let initialized = false;

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function storageGet(key: string): string | null {
  if (!hasLocalStorage()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn("[MCP] localStorage write failed:", err);
  }
}

function storageRemove(key: string): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function promptFingerprint(content: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function requireKnownPrompt(name: string): string {
  const canonical = localManifest.prompts[name];
  if (canonical === undefined) {
    throw new Error(`Prompt "${name}" is not part of the bundled BlockIT prompt manifest.`);
  }
  return canonical;
}

function validatePromptOverride(name: string, content: string): void {
  requireKnownPrompt(name);
  if (content.trim().length === 0) {
    throw new Error("Prompt override cannot be blank. Reset to the bundled default instead.");
  }
  if (name === "bedrock_entity_workflow") {
    assertBedrockWorkflowSourceCompatible(content);
  }
}

function serializeOverrides(
  values: Record<string, string>
): z.infer<typeof promptOverrideStoreSchema> {
  return {
    schema_version: PROMPT_OVERRIDE_STORE_VERSION,
    overrides: Object.fromEntries(
      Object.entries(values).map(([name, content]) => {
        const canonical = requireKnownPrompt(name);
        return [
          name,
          {
            base_fingerprint: promptFingerprint(canonical),
            content,
          },
        ];
      })
    ),
  };
}

function loadOverrides(): Record<string, string> {
  const raw = storageGet(STORAGE_KEY_OVERRIDES);
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storageRemove(STORAGE_KEY_OVERRIDES);
    return {};
  }

  const store = promptOverrideStoreSchema.safeParse(parsed);
  if (!store.success) {
    // Old unversioned overrides predate phase-scoped prompt contracts. They are
    // intentionally discarded instead of silently carrying stale tool routes.
    storageRemove(STORAGE_KEY_OVERRIDES);
    return {};
  }

  const valid: Record<string, string> = {};
  for (const [name, entry] of Object.entries(store.data.overrides)) {
    const canonical = localManifest.prompts[name];
    if (canonical === undefined) continue;
    if (entry.base_fingerprint !== promptFingerprint(canonical)) continue;
    try {
      validatePromptOverride(name, entry.content);
      valid[name] = entry.content;
    } catch {
      // Invalid/stale custom workflow is dropped; bundled source stays authority.
    }
  }

  if (Object.keys(valid).length === 0) {
    storageRemove(STORAGE_KEY_OVERRIDES);
  } else if (Object.keys(valid).length !== Object.keys(store.data.overrides).length) {
    storageSet(STORAGE_KEY_OVERRIDES, JSON.stringify(serializeOverrides(valid)));
  }

  return valid;
}

function persistOverrides(): void {
  if (Object.keys(overrides).length === 0) {
    storageRemove(STORAGE_KEY_OVERRIDES);
    return;
  }
  storageSet(
    STORAGE_KEY_OVERRIDES,
    JSON.stringify(serializeOverrides(overrides))
  );
}

/** Initialize bundled Local prompts and compatible persisted user overrides. */
export async function initPromptLoader(): Promise<void> {
  overrides = loadOverrides();
  initialized = true;
  console.log(
    `[MCP] Local prompt manifest loaded (v${localManifest.version}, ${Object.keys(localManifest.prompts).length} prompts, ${Object.keys(overrides).length} compatible override(s))`
  );
}

/** Priority: compatible user override > bundled Local prompt > empty. */
export function getPromptContent(name: string): string {
  if (!initialized) {
    console.warn(
      "[MCP] getPromptContent called before initPromptLoader — returning empty"
    );
    return "";
  }

  const override = overrides[name];
  if (override !== undefined && override !== "") return override;
  return localManifest.prompts[name] ?? "";
}

export function setPromptOverride(name: string, content: string): void {
  validatePromptOverride(name, content);
  overrides = { ...overrides, [name]: content };
  persistOverrides();
}

export function clearPromptOverride(name: string): void {
  const { [name]: _removed, ...rest } = overrides;
  overrides = rest;
  persistOverrides();
}

export function hasPromptOverride(name: string): boolean {
  return name in overrides && overrides[name] !== "";
}

export function getPromptOverrides(): Record<string, string> {
  return { ...overrides };
}

export function getAvailablePromptNames(): string[] {
  return Object.keys(localManifest.prompts);
}

export function getManifest(): PromptManifest {
  return {
    ...localManifest,
    prompts: { ...localManifest.prompts },
  };
}
