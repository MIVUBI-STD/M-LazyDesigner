import { createHash } from "node:crypto";
import { canonicalJson } from "../../lib/semantic/canonical";
import { dirname, join } from "node:path";
import { readFile, stat } from "node:fs/promises";
import type { GatewayRuntimeStatus } from "../backend";

export type ControlWorkspaceProjection = {
  available: boolean;
  source_path: string | null;
  fingerprint: string | null;
  asset: string | null;
  current_stage: string | null;
  gates: {
    geometry: string | null;
    uv_layout: string | null;
    texturing: string | null;
    animation: string | null;
  };
  next_step: string | null;
  blockers: string[];
  unavailable_reason?: "PROJECT_PATH_UNAVAILABLE" | "README_NOT_FOUND" | "README_UNREADABLE";
};

type CachedWorkspace = {
  signature: string;
  projection: ControlWorkspaceProjection;
};

const MAX_WORKSPACE_README_BYTES = 1024 * 1024;
const cache = new Map<string, CachedWorkspace>();
const workspaceHintByProject = new Map<string, string>();

function field(text: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || null;
}

function parseBlockers(text: string): string[] {
  const value = field(text, "Known blocker(s)");
  if (!value || /^none\b/i.test(value)) return [];
  return value.split(/[;,]/).map((entry) => entry.trim()).filter(Boolean).slice(0, 8);
}


export type WorkspaceSemanticState = {
  asset: string | null;
  current_stage: string | null;
  gates: ControlWorkspaceProjection["gates"];
  next_step: string | null;
  blockers: string[];
};

export function workspaceSemanticState(text: string): WorkspaceSemanticState {
  return {
    asset: text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? null,
    current_stage: field(text, "Current Stage"),
    gates: {
      geometry: field(text, "Geometry"),
      uv_layout: field(text, "UV Layout"),
      texturing: field(text, "Texturing"),
      animation: field(text, "Animation"),
    },
    next_step: field(text, "Current next step"),
    blockers: parseBlockers(text),
  };
}

export function workspaceSemanticFingerprint(text: string): string {
  return createHash("sha256")
    .update(canonicalJson(workspaceSemanticState(text)))
    .digest("hex");
}

function projectSavePath(status: GatewayRuntimeStatus): string | null {
  const health = status.runtime.health as Record<string, unknown> | null;
  const context = health?.project_context;
  if (!context || typeof context !== "object" || Array.isArray(context)) return null;
  const record = context as Record<string, unknown>;
  for (const key of ["requested_project", "active_project"]) {
    const descriptor = record[key];
    if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) continue;
    const savePath = (descriptor as Record<string, unknown>).save_path;
    if (typeof savePath === "string" && savePath.length > 0) return savePath;
  }
  return null;
}

function resolveWorkspaceReadme(
  status: GatewayRuntimeStatus,
  workspacePath?: string | null
): string | null {
  const projectUuid = status.affinity.project_uuid;
  if (workspacePath && projectUuid) workspaceHintByProject.set(projectUuid, workspacePath);
  const hint = workspacePath ?? (projectUuid ? workspaceHintByProject.get(projectUuid) : undefined);
  if (hint) return /README\.md$/i.test(hint) ? hint : join(hint, "README.md");
  const savePath = projectSavePath(status);
  return savePath ? join(dirname(savePath), "README.md") : null;
}

export async function readWorkspaceProjection(
  status: GatewayRuntimeStatus,
  workspacePath?: string | null
): Promise<ControlWorkspaceProjection> {
  const readmePath = resolveWorkspaceReadme(status, workspacePath);
  if (!readmePath) {
    return {
      available: false,
      source_path: null,
      fingerprint: null,
      asset: null,
      current_stage: null,
      gates: { geometry: null, uv_layout: null, texturing: null, animation: null },
      next_step: null,
      blockers: [],
      unavailable_reason: "PROJECT_PATH_UNAVAILABLE",
    };
  }

  try {
    const info = await stat(readmePath);
    if (!info.isFile() || info.size > MAX_WORKSPACE_README_BYTES) {
      return {
        available: false,
        source_path: readmePath,
        fingerprint: null,
        asset: null,
        current_stage: null,
        gates: { geometry: null, uv_layout: null, texturing: null, animation: null },
        next_step: null,
        blockers: [],
        unavailable_reason: "README_UNREADABLE",
      };
    }
    const signature = `${info.size}:${info.mtimeMs}`;
    const cached = cache.get(readmePath);
    if (cached?.signature === signature) return cached.projection;

    const text = await readFile(readmePath, "utf8");
    const semantic = workspaceSemanticState(text);
    const projection: ControlWorkspaceProjection = {
      available: true,
      source_path: readmePath,
      fingerprint: workspaceSemanticFingerprint(text),
      ...semantic,
    };
    cache.set(readmePath, { signature, projection });
    return projection;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    return {
      available: false,
      source_path: readmePath,
      fingerprint: null,
      asset: null,
      current_stage: null,
      gates: { geometry: null, uv_layout: null, texturing: null, animation: null },
      next_step: null,
      blockers: [],
      unavailable_reason: code === "ENOENT" ? "README_NOT_FOUND" : "README_UNREADABLE",
    };
  }
}
