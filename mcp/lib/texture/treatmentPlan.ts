import {
  inspectEntityRenderMaterialCode,
  minecraftMaterialCodeForRenderProfile,
  type EntityRenderProfile,
} from "./renderProfile";
import {
  getTextureSurfacePatternRecipe,
  type TextureSurfacePattern,
} from "./surfacePattern";

export type TextureTreatmentEvidenceState = "observed" | "inferred" | "unknown";
export type TextureTreatmentPbrIntent =
  | "none"
  | "optional"
  | "normal"
  | "height"
  | "mer"
  | "mers";

export type TextureTreatmentRegionInput = {
  region: string;
  evidence: TextureTreatmentEvidenceState;
  surface_pattern?: TextureSurfacePattern | null;
  render_profile?: EntityRenderProfile | null;
  minecraft_material_code?: string | null;
  pbr_intent?: TextureTreatmentPbrIntent;
  identity_colors?: readonly string[];
  notes?: readonly string[];
};

export type TextureTreatmentPlanInput = {
  identity_colors?: readonly string[];
  regions: readonly TextureTreatmentRegionInput[];
};

export function planTextureTreatment(input: TextureTreatmentPlanInput) {
  if (!input.regions.length) {
    throw new Error("Texture treatment planning requires at least one region.");
  }
  const seen = new Set<string>();
  const unresolved: Array<{ region: string; reason: string }> = [];

  const regions = input.regions.map((region) => {
    const name = region.region.trim();
    if (!name) throw new Error("Texture treatment region names must be non-empty.");
    if (seen.has(name)) {
      throw new Error(`Texture treatment region "${name}" appears more than once.`);
    }
    seen.add(name);

    const pattern = region.surface_pattern
      ? getTextureSurfacePatternRecipe(region.surface_pattern)
      : null;
    if (!pattern) unresolved.push({ region: name, reason: "SURFACE_PATTERN_UNRESOLVED" });

    let render = null;
    if (region.minecraft_material_code) {
      render = inspectEntityRenderMaterialCode(region.minecraft_material_code);
      if (
        region.render_profile &&
        region.render_profile !== "custom" &&
        render.render_profile !== region.render_profile
      ) {
        throw new Error(
          `Region "${name}" render_profile ${region.render_profile} conflicts with minecraft_material_code ${region.minecraft_material_code}.`
        );
      }
    } else if (region.render_profile) {
      if (region.render_profile === "custom") {
        unresolved.push({ region: name, reason: "CUSTOM_MATERIAL_CODE_REQUIRED" });
      } else {
        render = inspectEntityRenderMaterialCode(
          minecraftMaterialCodeForRenderProfile(region.render_profile)
        );
      }
    } else {
      unresolved.push({ region: name, reason: "RENDER_PROFILE_UNRESOLVED" });
    }

    if (region.evidence === "unknown") {
      unresolved.push({ region: name, reason: "REFERENCE_EVIDENCE_UNKNOWN" });
    }

    const pbrIntent = region.pbr_intent ?? "none";
    return {
      region: name,
      evidence: region.evidence,
      surface_pattern: pattern,
      render_contract: render,
      pbr_intent: pbrIntent,
      pbr_depth_source:
        pbrIntent === "normal"
          ? "normal"
          : pbrIntent === "height"
            ? "height"
            : "none",
      identity_colors: [...(region.identity_colors ?? [])],
      notes: [...(region.notes ?? [])],
      invariant:
        "surface_pattern describes RGB/pixel language only and never selects render_profile or PBR automatically",
    };
  });

  return {
    domain: "texture_treatment_plan" as const,
    identity_colors: [...(input.identity_colors ?? [])],
    passes: [
      "BASE PASS",
      "VALUE / FORM PASS",
      "SURFACE PATTERN PASS",
      "IDENTITY PASS",
      "SECONDARY DETAIL PASS",
      "RENDER / ALPHA VERIFY",
      "MAPPED MODEL VERIFY",
    ] as const,
    regions,
    readiness: {
      state: unresolved.length ? ("review_required" as const) : ("ready" as const),
      unresolved,
    },
    rules: {
      pattern_does_not_select_render_profile: true,
      render_profile_does_not_select_surface_pattern: true,
      pbr_is_optional_and_explicit: true,
      no_similarity_score: true,
    },
  };
}
