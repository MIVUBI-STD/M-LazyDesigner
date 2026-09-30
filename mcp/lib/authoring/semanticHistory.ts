/// <reference types="blockbench-types" />

import { z } from "zod";
import {
  CAPABILITY_SEMANTIC_SCOPES,
  capabilityDefaultStaleScopes,
  type CapabilitySemanticScope,
} from "../capabilities/manifest";

export type SemanticHistoryScope = CapabilitySemanticScope;

export type SemanticHistoryEffect = {
  stale: SemanticHistoryScope[];
  workspace_projection: boolean;
  acceptance_gates: boolean;
};

export const semanticHistoryEffectSchema = z.object({
  stale: z.array(z.enum(CAPABILITY_SEMANTIC_SCOPES)),
  workspace_projection: z.boolean(),
  acceptance_gates: z.boolean(),
});

export function isSemanticHistoryEffect(
  value: unknown
): value is SemanticHistoryEffect {
  return semanticHistoryEffectSchema.safeParse(value).success;
}

export type SemanticHistoryEffectOptions = {
  workspace_projection?: boolean;
  acceptance_gates?: boolean;
};

const effects = new WeakMap<object, SemanticHistoryEffect>();

function normalizedScopes(
  scopes: readonly SemanticHistoryScope[]
): SemanticHistoryScope[] {
  return [...new Set(scopes)].sort((a, b) => a.localeCompare(b));
}

export function recordSemanticHistoryEffect(
  entry: object | null | undefined,
  scopes: readonly SemanticHistoryScope[],
  options: SemanticHistoryEffectOptions = {}
): void {
  if (!entry) return;
  effects.set(entry, {
    stale: normalizedScopes(scopes),
    workspace_projection: options.workspace_projection ?? scopes.length > 0,
    acceptance_gates: options.acceptance_gates ?? scopes.length > 0,
  });
}

export function semanticHistoryEffectForEntry(
  entry: object | null | undefined
): SemanticHistoryEffect | null {
  return entry ? effects.get(entry) ?? null : null;
}

export function mergeSemanticHistoryEffects(
  entries: readonly (object | null | undefined)[]
): SemanticHistoryEffect | null {
  const resolved = entries.map(semanticHistoryEffectForEntry);
  if (resolved.some((effect) => effect === null)) return null;
  return {
    stale: normalizedScopes(
      resolved.flatMap((effect) => effect?.stale ?? [])
    ),
    workspace_projection: resolved.some(
      (effect) => effect?.workspace_projection === true
    ),
    acceptance_gates: resolved.some(
      (effect) => effect?.acceptance_gates === true
    ),
  };
}

export function recordCurrentCapabilitySemanticHistoryEffect(
  capability: string,
  options: SemanticHistoryEffectOptions = {}
): void {
  recordCurrentSemanticHistoryEffect(
    capabilityDefaultStaleScopes(capability),
    options
  );
}

export function recordCurrentCapabilitySemanticHistoryEffectIfAdvanced(
  capability: string,
  previousIndex: number,
  options: SemanticHistoryEffectOptions = {}
): boolean {
  if (typeof Undo === "undefined") return false;
  if ((Undo.index ?? 0) <= previousIndex) return false;
  recordCurrentCapabilitySemanticHistoryEffect(capability, options);
  return true;
}

export function recordCurrentSemanticHistoryEffect(
  scopes: readonly SemanticHistoryScope[],
  options: SemanticHistoryEffectOptions = {}
): void {
  if (typeof Undo === "undefined") return;
  const history = Undo.history ?? [];
  const index = (Undo.index ?? 0) - 1;
  if (index < 0) return;
  recordSemanticHistoryEffect(
    history[index] as object | undefined,
    scopes,
    options
  );
}
