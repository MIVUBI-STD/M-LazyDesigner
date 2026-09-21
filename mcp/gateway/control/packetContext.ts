import { createHash } from "node:crypto";
import type { ControlDevelopmentResolution } from "./developmentIntent";
import type { ControlReferenceProjection } from "./referenceTypes";
import type { ControlWorkspaceProjection } from "./workspace";
import type {
  ControlContextHandle,
  ControlSnapshot,
} from "./types";

export type ControlContextDelivery = {
  required: ControlContextHandle[];
  optional: ControlContextHandle[];
  cached_ids: string[];
  invalidated_ids: string[];
};

export type ControlTaskMode = "ASSET_AUTHORING" | "SYSTEM_DEVELOPMENT";

function runtimeContextIdentity(snapshot: ControlSnapshot): string {
  return snapshot.runtime.build_identity ?? snapshot.runtime.runtime_signature ?? "offline";
}

export function taskContextId(
  snapshot: ControlSnapshot,
  workspace: ControlWorkspaceProjection,
  reference: ControlReferenceProjection,
  mode: ControlTaskMode,
  development: ControlDevelopmentResolution | null,
  currentUserDelta: string | null
): string {
  const payload = mode === "SYSTEM_DEVELOPMENT"
    ? [
        mode,
        runtimeContextIdentity(snapshot),
        development?.domain ?? "no-development-domain",
        development?.intent ?? "no-development-intent",
      ]
    : [
        mode,
        snapshot.project.affinity_uuid ?? "unbound",
        snapshot.authoring.phase ?? "unknown",
        runtimeContextIdentity(snapshot),
        workspace.fingerprint ?? "no-workspace-state",
        reference.fingerprint ?? "no-reference-package",
        currentUserDelta ?? "no-user-delta",
      ];
  return `task:${createHash("sha256").update(payload.join("|")).digest("hex").slice(0, 20)}`;
}

function contextFamily(id: string): string {
  const at = id.lastIndexOf("@");
  const versionless = at > 0 ? id.slice(0, at) : id;

  // Only one specialist and one Geometry profile may be active. Treat their
  // concrete labels as members of a broad supersession family so a phase/profile
  // change explicitly invalidates the prior handle instead of leaving two
  // authoritative guidance sources live in the client context.
  if (versionless.startsWith("ctx:skill/")) return "ctx:skill";
  if (versionless.startsWith("ctx:profile/")) return "ctx:profile";
  return versionless;
}

export function filterContext(
  snapshot: ControlSnapshot,
  knownContextIds: readonly string[],
  mode: ControlTaskMode
): ControlContextDelivery {
  if (mode === "SYSTEM_DEVELOPMENT") {
    return { required: [], optional: [], cached_ids: [], invalidated_ids: [] };
  }

  const known = new Set(knownContextIds);
  const current = [...snapshot.context.required, ...snapshot.context.optional];
  const currentIds = new Set(current.map((handle) => handle.id));
  const currentFamilies = new Set(current.map((handle) => contextFamily(handle.id)));

  return {
    required: snapshot.context.required.filter((handle) => !known.has(handle.id)),
    optional: snapshot.context.optional.filter((handle) => !known.has(handle.id)),
    cached_ids: current.filter((handle) => known.has(handle.id)).map((handle) => handle.id),
    invalidated_ids: knownContextIds.filter(
      (id) => !currentIds.has(id) && currentFamilies.has(contextFamily(id))
    ),
  };
}


