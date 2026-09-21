import type { Rgba } from "@/lib/texture/proceduralOps";
import type { ScalarMask } from "@/lib/texture/masks";
import { applyMaskedColor } from "@/lib/texture/maskedOps";

export type GeometrySurfaceSignals = {
  edge?: ScalarMask;
  cavity?: ScalarMask;
  contact?: ScalarMask;
  upward_exposure?: ScalarMask;
  lower_exposure?: ScalarMask;
};

export type GeometryAwareMaterialIntent = {
  wear?: { color: Rgba; strength: number };
  cavity_dirt?: { color: Rgba; strength: number };
  contact_dirt?: { color: Rgba; strength: number };
  upward_fade?: { color: Rgba; strength: number };
  lower_grime?: { color: Rgba; strength: number };
};

function assertMask(mask: ScalarMask | undefined, width: number, height: number, label: string): void {
  if (!mask) return;
  if (mask.width !== width || mask.height !== height || mask.values.length !== width * height) {
    throw new Error(label + " mask dimensions do not match texture dimensions.");
  }
}

function requireStrength(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(label + " strength must be within 0..1.");
  }
  return value;
}

export function applyGeometryAwareMaterialTreatment(
  rgba: Uint8Array,
  width: number,
  height: number,
  signals: GeometrySurfaceSignals,
  intent: GeometryAwareMaterialIntent
): Uint8Array {
  if (rgba.length !== width * height * 4) {
    throw new Error("Geometry-aware treatment RGBA length does not match dimensions.");
  }
  for (const [name, mask] of Object.entries(signals)) {
    assertMask(mask, width, height, name);
  }

  let out: Uint8Array = new Uint8Array(rgba);
  const steps: Array<[ScalarMask | undefined, { color: Rgba; strength: number } | undefined, string]> = [
    [signals.edge, intent.wear, "wear"],
    [signals.cavity, intent.cavity_dirt, "cavity dirt"],
    [signals.contact, intent.contact_dirt, "contact dirt"],
    [signals.upward_exposure, intent.upward_fade, "upward fade"],
    [signals.lower_exposure, intent.lower_grime, "lower grime"],
  ];
  for (const [mask, treatment, label] of steps) {
    if (!mask || !treatment) continue;
    out = applyMaskedColor(out, width, height, mask, treatment.color, requireStrength(treatment.strength, label));
  }
  return out;
}

export function summarizeGeometryAwareTreatment(
  signals: GeometrySurfaceSignals,
  intent: GeometryAwareMaterialIntent
) {
  const active: string[] = [];
  if (signals.edge && intent.wear) active.push("EDGE_WEAR");
  if (signals.cavity && intent.cavity_dirt) active.push("CAVITY_DIRT");
  if (signals.contact && intent.contact_dirt) active.push("CONTACT_DIRT");
  if (signals.upward_exposure && intent.upward_fade) active.push("UPWARD_EXPOSURE");
  if (signals.lower_exposure && intent.lower_grime) active.push("LOWER_GRIME");
  return { active_treatments: active, treatment_count: active.length };
}
