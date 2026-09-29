import {
  assetDependencyForScope,
  type AssetDependencyDomain,
  type AssetDependencyRecheckAction,
} from "../../../lib/assetDependencyGraph";
import type {
  ControlAuthoringDomain,
  ControlFreshnessScope,
} from "../types";
import { record, resultCandidates } from "./receipts";

export type ControlRecheckAction = AssetDependencyRecheckAction;

export type ControlDownstreamRecheck = {
  scope: ControlFreshnessScope;
  domain: ControlAuthoringDomain;
  action: ControlRecheckAction;
  reason: string;
  target?: {
    cube_ids?: string[];
    island_ids?: string[];
    faces?: Array<{ cube_uuid: string; face: string | null }>;
  };
};

function uvTargetFromResult(result: unknown): ControlDownstreamRecheck["target"] | undefined {
  for (const candidate of resultCandidates(result)) {
    const receipt = record(candidate.receipt) ?? candidate;
    const cubeIds = Array.isArray(receipt.changed_cube_ids)
      ? receipt.changed_cube_ids.filter((value): value is string => typeof value === "string")
      : [];
    const islandIds = Array.isArray(receipt.changed_island_ids)
      ? receipt.changed_island_ids.filter((value): value is string => typeof value === "string")
      : [];
    const faces = Array.isArray(receipt.changed_faces)
      ? receipt.changed_faces.flatMap((value) => {
          const face = record(value);
          return typeof face?.cube_uuid === "string" &&
            (typeof face.face === "string" || face.face === null)
            ? [{ cube_uuid: face.cube_uuid, face: face.face as string | null }]
            : [];
        })
      : [];
    if (cubeIds.length || islandIds.length || faces.length) {
      return {
        ...(cubeIds.length ? { cube_ids: [...new Set(cubeIds)] } : {}),
        ...(islandIds.length ? { island_ids: [...new Set(islandIds)] } : {}),
        ...(faces.length ? { faces } : {}),
      };
    }
  }
  return undefined;
}

function materialRenderTargetFromResult(
  result: unknown
): ControlDownstreamRecheck["target"] | undefined {
  for (const candidate of resultCandidates(result)) {
    const changes = Array.isArray(candidate.changes) ? candidate.changes : [];
    const faces = changes.flatMap((value) => {
      const change = record(value);
      return typeof change?.cube_uuid === "string" &&
        typeof change.face === "string"
        ? [{ cube_uuid: change.cube_uuid, face: change.face }]
        : [];
    });
    if (!faces.length) continue;
    return {
      cube_ids: [...new Set(faces.map((entry) => entry.cube_uuid))],
      faces,
    };
  }
  return undefined;
}

function textureRegionTargetFromResult(
  result: unknown
): ControlDownstreamRecheck["target"] | undefined {
  for (const candidate of resultCandidates(result)) {
    const texture = record(candidate.texture);
    const revision = record(candidate.revision);
    const rect = candidate.affected_rect;
    if (
      typeof texture?.uuid === "string" &&
      typeof revision?.after === "string" &&
      Array.isArray(rect) &&
      rect.length === 4 &&
      rect.every(
        (value) => typeof value === "number" && Number.isSafeInteger(value)
      )
    ) {
      return {
        texture_uuid: texture.uuid,
        affected_rect: rect as [number, number, number, number],
        revision: revision.after,
      };
    }
  }
  return undefined;
}

export function downstreamRechecksForFreshness(input: {
  stale: readonly ControlFreshnessScope[];
  currentDomain: ControlAuthoringDomain;
  result?: unknown;
}): {
  required: ControlDownstreamRecheck[];
  preserved_domains: ControlAuthoringDomain[];
} {
  const required = [...new Set(input.stale)]
    .map((scope) => {
      const dependency = assetDependencyForScope(scope);
      const target =
        scope === "UV_MAPPING"
          ? uvTargetFromResult(input.result)
          : scope === "TEXTURE_APPEARANCE"
            ? uvTargetFromResult(input.result) ??
              textureRegionTargetFromResult(input.result)
            : scope === "MATERIAL_RENDER"
              ? materialRenderTargetFromResult(input.result)
              : undefined;
      return {
        scope,
        domain: dependency.domain,
        action: dependency.recheck,
        reason: dependency.reason,
        ...(target ? { target } : {}),
      };
    })
    .sort(
      (left, right) =>
        left.domain.localeCompare(right.domain) ||
        left.scope.localeCompare(right.scope)
    );

  const affectedDomains = new Set(required.map((entry) => entry.domain));
  const all: AssetDependencyDomain[] = [
    "GEOMETRY",
    "TEXTURING",
    "ANIMATION",
  ];
  const preserved = all.filter(
    (domain) =>
      domain !== input.currentDomain && !affectedDomains.has(domain)
  );

  return {
    required,
    preserved_domains: preserved,
  };
}
