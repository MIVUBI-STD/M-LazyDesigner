import { describe, expect, test } from "bun:test";
import {
  buildControlStageContext,
  semanticFactsForAuthoringDomain,
  stageReferenceSemanticFingerprint,
} from "./contextProjection";
import type { ControlReferenceProjection } from "./referenceTypes";
import type { ControlWorkspaceProjection } from "./workspace";

const workspace: ControlWorkspaceProjection = {
  available: true,
  source_path: null,
  fingerprint: "workspace|one",
  asset: "Deer",
  current_stage: "Geometry",
  gates: {
    geometry: "IN_PROGRESS",
    uv_layout: "NOT_STARTED",
    texturing: "NOT_STARTED",
    animation: "NOT_STARTED",
  },
  next_step: "refine silhouette",
  blockers: [],
};

const reference: ControlReferenceProjection = {
  available: true,
  source_path: null,
  package_root: null,
  fingerprint: "reference|whole",
  schema: "lazydesigner-reference-v1",
  asset_name: "Deer",
  asset_kind: "MODEL",
  intent: "build a Minecraft Bedrock deer",
  selected_profile: "CREATURE",
  requirements: {
    dimensions_blocks: { width: 1.2, height: 1.8, length: 2.1 },
    player_relative_scale: "PLAYER_HEIGHT",
    animation_required: true,
  },
  readiness: {
    overall: "READY",
    geometry: "READY",
    texture: "READY",
    animation: "READY",
  },
  particle: null,
  blocking_unknowns: [],
  non_blocking_unknowns: ["underside tail color"],
  documents: {
    GEOMETRY: "GEOMETRY.md",
    TEXTURE: "TEXTURE.md",
    ANIMATION: "ANIMATION.md",
  },
  images: [
    {
      id: "geo-main",
      file: "geo.png",
      role: "PRIMARY_GEOMETRY",
      used_by: ["GEOMETRY"],
      status: "APPROVED",
    },
    {
      id: "tex-main",
      file: "tex.png",
      role: "MATERIAL_TEXTURE",
      used_by: ["TEXTURE"],
      status: "APPROVED",
    },
  ],
  semantic_facts: {
    parts: [
      {
        id: "torso",
        role: "GEOMETRY",
        motion: "STATIC",
        evidence: "SUPPORTED",
      },
      {
        id: "front_leg",
        role: "GEOMETRY",
        motion: "ARTICULATED",
        evidence: "SUPPORTED",
      },
      {
        id: "blink",
        role: "ANIMATION_ONLY",
        motion: "ARTICULATED",
        evidence: "SUPPORTED",
      },
      {
        id: "coat_marking",
        role: "TEXTURE",
        motion: "STATIC",
        evidence: "SUPPORTED",
      },
    ],
    articulation: [
      {
        id: "front_leg_joint",
        pivot_region: "shoulder",
        risk: "joint gap",
      },
    ],
    materials: [
      {
        id: "coat",
        base_color: "brown",
        affected_parts: ["torso", "front_leg"],
      },
    ],
    animation_guidance: [
      {
        name: "walk",
        type: "LOOP",
        participants: ["front_leg"],
      },
    ],
    constraints: ["preserve slender leg silhouette"],
  },
};

describe("Control stage semantic projection", () => {
  test("projects only decision-critical facts for the active authoring owner", () => {
    const geometry = semanticFactsForAuthoringDomain("GEOMETRY", reference);
    const texture = semanticFactsForAuthoringDomain("TEXTURING", reference);
    const animation = semanticFactsForAuthoringDomain("ANIMATION", reference);

    expect(geometry.parts.map((part) => part.id)).toEqual([
      "torso",
      "front_leg",
    ]);
    expect(geometry.articulation).toHaveLength(1);
    expect(geometry.materials).toEqual([]);
    expect(geometry.animation_guidance).toEqual([]);

    expect(texture.parts).toEqual([]);
    expect(texture.articulation).toEqual([]);
    expect(texture.materials).toHaveLength(1);
    expect(texture.animation_guidance).toEqual([]);

    expect(animation.parts.map((part) => part.id)).toEqual([
      "front_leg",
      "blink",
    ]);
    expect(animation.articulation).toHaveLength(1);
    expect(animation.materials).toEqual([]);
    expect(animation.animation_guidance).toHaveLength(1);
  });

  test("geometry fingerprint ignores texture-only fact changes", () => {
    const base = stageReferenceSemanticFingerprint("GEOMETRY", reference);
    const textureChanged: ControlReferenceProjection = {
      ...reference,
      fingerprint: "reference|texture-change",
      semantic_facts: {
        ...reference.semantic_facts!,
        materials: [
          {
            id: "coat",
            base_color: "dark brown",
            affected_parts: ["torso", "front_leg"],
          },
        ],
      },
    };

    expect(
      stageReferenceSemanticFingerprint("GEOMETRY", textureChanged)
    ).toBe(base);
    expect(
      stageReferenceSemanticFingerprint("TEXTURING", textureChanged)
    ).not.toBe(stageReferenceSemanticFingerprint("TEXTURING", reference));
  });

  test("geometry fingerprint changes for geometry facts and active image authority", () => {
    const base = stageReferenceSemanticFingerprint("GEOMETRY", reference);
    const partChanged: ControlReferenceProjection = {
      ...reference,
      semantic_facts: {
        ...reference.semantic_facts!,
        parts: reference.semantic_facts!.parts.map((part) =>
          part.id === "front_leg"
            ? { ...part, evidence: "CONFLICTING" }
            : part
        ),
      },
    };
    const imageChanged: ControlReferenceProjection = {
      ...reference,
      images: reference.images.map((image) =>
        image.id === "geo-main"
          ? { ...image, file: "geo-v2.png" }
          : image
      ),
    };

    expect(
      stageReferenceSemanticFingerprint("GEOMETRY", partChanged)
    ).not.toBe(base);
    expect(
      stageReferenceSemanticFingerprint("GEOMETRY", imageChanged)
    ).not.toBe(base);
  });

  test("stage context carries the compact semantic projection", () => {
    const context = buildControlStageContext({
      domain: "GEOMETRY",
      reference,
      workspace,
      currentUserDelta: "make the legs slightly longer",
    });

    expect(context.semantic_facts.parts.map((part) => part.id)).toEqual([
      "torso",
      "front_leg",
    ]);
    expect(context.semantic_facts.materials).toEqual([]);
    expect(context.reference_image_ids).toEqual(["geo-main"]);
    expect(context.current_user_delta).toBe(
      "make the legs slightly longer"
    );
  });
});
