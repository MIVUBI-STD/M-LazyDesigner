import type { Vec3 } from "./contactEvidence";

/**
 * A semantic declaration by the caller, not a verified user approval.
 * UUIDs must be taken from current focused native evidence. A matching
 * Locator name never substitutes for its exact identity.
 */
export type ExplicitContactMarkerBinding = {
  id: string;
  role: "FOOT_PLANT" | "HAND_GRIP" | "TOOL_CONTACT" | "IMPACT_POINT";
  intent_authority: "DECLARED_USER_INTENT" | "DECLARED_REFERENCE_INTENT";
  evidence_ref: string;
  project_uuid: string;
  animation_uuid: string;
  group_uuid: string;
  locator_uuid: string;
};

/** Structural projection of the existing focused current_pose_snapshot. */
export type ContactMarkerPoseSnapshot = {
  state: "OBSERVED" | "UNVERIFIED";
  source?: string;
  project_uuid?: string;
  animation_uuid?: string;
  group_uuid?: string;
  timeline_time_observed?: number;
  frame_pose_synchronized?: boolean;
  contact_marker_attested?: boolean;
  native_animation_sampling_performed?: boolean;
  visual_verdict?: string;
  locator_candidates?: {
    state: "AVAILABLE" | "PARTIAL" | "NONE" | "UNVERIFIED";
    scope?: string;
    role?: string;
    count?: number | null;
    observed_count?: number;
    candidates: readonly {
      uuid: string;
      state: "OBSERVED" | "UNVERIFIED";
      world_position: Vec3 | null;
    }[];
  };
};

export const CONTACT_MARKER_BINDING_LIMIT = 16;

type UnverifiedReason =
  | "SNAPSHOT_IDENTITY_MISMATCH"
  | "LOCATOR_NOT_IN_CURRENT_BONE"
  | "LOCATOR_WORLD_POSITION_UNVERIFIED"
  | "LOCATOR_WORLD_POSITION_INVALID";

type BoundMarkerResult =
  | {
      id: string;
      role: ExplicitContactMarkerBinding["role"];
      state: "LINKED_CURRENT_PREVIEW_ONLY";
      reason: null;
      locator_uuid: string;
      world_position: Vec3;
    }
  | {
      id: string;
      role: ExplicitContactMarkerBinding["role"];
      state: "UNVERIFIED";
      reason: UnverifiedReason;
      locator_uuid: string;
      world_position: null;
    };

function validId(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0 &&
    id.length <= 160 && id === id.trim();
}

function finiteWorldPosition(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 &&
    value.every((part) => typeof part === "number" && Number.isFinite(part));
}

function validBinding(value: ExplicitContactMarkerBinding): boolean {
  return validId(value.id) && validId(value.evidence_ref) &&
    validId(value.project_uuid) && validId(value.animation_uuid) &&
    validId(value.group_uuid) && validId(value.locator_uuid) &&
    ["FOOT_PLANT", "HAND_GRIP", "TOOL_CONTACT", "IMPACT_POINT"].includes(value.role) &&
    ["DECLARED_USER_INTENT", "DECLARED_REFERENCE_INTENT"].includes(value.intent_authority);
}

/**
 * Pure, bounded, fail-closed semantic binding of explicitly declared roles to
 * candidates on ONE already-displayed Blockbench pose. The input remains
 * caller-supplied data; it cannot independently attest native origin, human
 * approval, actual time/pose synchronization, contact, or animation motion.
 */
export function bindExplicitContactMarkers(input: {
  snapshot: ContactMarkerPoseSnapshot;
  bindings: readonly ExplicitContactMarkerBinding[];
}) {
  const shared = {
    scope: "FOCUSED_BONE_CURRENT_PREVIEW" as const,
    role_authority: "CALLER_DECLARED_NOT_INDEPENDENTLY_VERIFIED" as const,
    frame_pose_synchronized: false as const,
    native_timeline_sampling_performed: false as const,
    physical_contact_verified: false as const,
    visual_verdict: "NOT_EVALUATED" as const,
  };
  const unavailable = (reason: string) => ({
    ...shared,
    state: "UNVERIFIED" as const,
    reason,
    requested_count: Array.isArray(input.bindings) ? input.bindings.length : 0,
    linked_count: 0,
    unresolved_count: 0,
    bindings: [] as BoundMarkerResult[],
  });

  if (!Array.isArray(input.bindings) ||
      input.bindings.length < 1 ||
      input.bindings.length > CONTACT_MARKER_BINDING_LIMIT) {
    return unavailable("CONTACT_BINDING_SELECTION_INVALID");
  }
  const seenBindings = new Set<string>();
  const seenLocators = new Set<string>();
  for (const binding of input.bindings) {
    if (!binding || !validBinding(binding)) {
      return unavailable("CONTACT_BINDING_DECLARATION_INVALID");
    }
    if (seenBindings.has(binding.id) || seenLocators.has(binding.locator_uuid)) {
      return unavailable("CONTACT_BINDING_DUPLICATE_IDENTITY");
    }
    seenBindings.add(binding.id);
    seenLocators.add(binding.locator_uuid);
  }

  const snapshot = input.snapshot;
  if (!snapshot || snapshot.state !== "OBSERVED" ||
      snapshot.source !== "CURRENT_EDITOR_PREVIEW_ONLY" ||
      !validId(snapshot.project_uuid) ||
      !validId(snapshot.animation_uuid) ||
      !validId(snapshot.group_uuid) ||
      !Number.isFinite(snapshot.timeline_time_observed) ||
      snapshot.timeline_time_observed! < 0 ||
      snapshot.frame_pose_synchronized !== false ||
      snapshot.contact_marker_attested !== false ||
      snapshot.native_animation_sampling_performed !== false ||
      snapshot.visual_verdict !== "NOT_EVALUATED") {
    return unavailable("CURRENT_POSE_NOT_ELIGIBLE_FOR_ROLE_LINK");
  }
  const locators = snapshot.locator_candidates;
  if (!locators ||
      !["AVAILABLE", "PARTIAL", "NONE"].includes(locators.state) ||
      locators.scope !== "DIRECT_CHILD_NATIVE_LOCATORS_ONLY" ||
      locators.role !== "UNASSIGNED_CONTACT_INTENT" ||
      !Array.isArray(locators.candidates) ||
      locators.candidates.length > CONTACT_MARKER_BINDING_LIMIT) {
    return unavailable("DIRECT_NATIVE_LOCATOR_EVIDENCE_UNAVAILABLE");
  }

  const actualObservedCount = locators.candidates.filter(
    (candidate) => candidate?.state === "OBSERVED"
  ).length;
  const expectedState = locators.candidates.length === 0 ? "NONE" :
    actualObservedCount === locators.candidates.length ? "AVAILABLE" : "PARTIAL";
  if (locators.count !== locators.candidates.length ||
      locators.observed_count !== actualObservedCount ||
      locators.state !== expectedState) {
    return unavailable("LOCATOR_SUMMARY_INCONSISTENT");
  }

  const candidates = new Map<string, (typeof locators.candidates)[number]>();
  for (const candidate of locators.candidates) {
    if (!candidate || !validId(candidate.uuid) || candidates.has(candidate.uuid)) {
      return unavailable("AMBIGUOUS_LOCATOR_SNAPSHOT_IDENTITY");
    }
    candidates.set(candidate.uuid, candidate);
  }

  const bindings: BoundMarkerResult[] = input.bindings.map((binding) => {
    const basic = {
      id: binding.id, role: binding.role, locator_uuid: binding.locator_uuid,
      intent_authority: binding.intent_authority,
      evidence_ref: binding.evidence_ref,
    };
    const unresolved = (reason: UnverifiedReason): BoundMarkerResult => ({
      ...basic, state: "UNVERIFIED", reason, world_position: null,
    });
    if (binding.project_uuid !== snapshot.project_uuid ||
        binding.animation_uuid !== snapshot.animation_uuid ||
        binding.group_uuid !== snapshot.group_uuid) {
      return unresolved("SNAPSHOT_IDENTITY_MISMATCH");
    }
    const candidate = candidates.get(binding.locator_uuid);
    if (!candidate) return unresolved("LOCATOR_NOT_IN_CURRENT_BONE");
    if (candidate.state !== "OBSERVED") {
      return unresolved("LOCATOR_WORLD_POSITION_UNVERIFIED");
    }
    if (!finiteWorldPosition(candidate.world_position)) {
      return unresolved("LOCATOR_WORLD_POSITION_INVALID");
    }
    return {
      ...basic,
      state: "LINKED_CURRENT_PREVIEW_ONLY",
      reason: null,
      world_position: [...candidate.world_position] as [number, number, number],
    };
  });

  const linkedCount = bindings.filter((binding) =>
    binding.state === "LINKED_CURRENT_PREVIEW_ONLY"
  ).length;
  return {
    ...shared,
    state: linkedCount === bindings.length
      ? ("LINKED_CURRENT_PREVIEW_ONLY" as const)
      : ("PARTIAL_UNVERIFIED" as const),
    reason: linkedCount === bindings.length ? null : "ONE_OR_MORE_BINDINGS_UNVERIFIED",
    requested_count: bindings.length,
    linked_count: linkedCount,
    unresolved_count: bindings.length - linkedCount,
    bindings,
  };
}
