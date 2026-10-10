import { describe, expect, test } from "bun:test";
import {
  emptyReference,
  parseReferencePackage,
} from "./referenceParser";

describe("Control reference parser", () => {
  test("rejects malformed JSON and wrong schema", () => {
    expect(parseReferencePackage("{", "/tmp/REFERENCE.json", "/tmp")).toBeNull();
    expect(
      parseReferencePackage(
        JSON.stringify({ schema: "other-schema" }),
        "/tmp/REFERENCE.json",
        "/tmp"
      )
    ).toBeNull();
  });

  test("projects model reference data deterministically", () => {
    const raw = JSON.stringify({
      schema: "lazydesigner-reference-v1",
      asset: {
        name: "Chair",
        kind: "MODEL",
        profile: "PROP_FURNITURE",
        intent: "build chair",
      },
      requirements: {
        dimensions_blocks: { width: 1, height: 2, length: 1 },
        player_relative_scale: "human scale",
        animation_required: false,
      },
      readiness: {
        overall: "READY",
        geometry: "READY",
        texture: "UNKNOWN",
        animation: "UNKNOWN",
      },
      unknowns: {
        blocking: ["texture decision"],
        non_blocking: ["optional animation"],
      },
      documents: {
        geometry: "geometry.md",
        texture: "texture.md",
      },
      images: [
        {
          id: "front",
          file: "front.png",
          role: "front",
          used_by: ["geometry", "TEXTURE", "invalid"],
          status: "ready",
        },
      ],
      parts: [
        {
          id: "seat",
          role: "GEOMETRY",
          symmetry: "NONE",
          motion: "STATIC",
          evidence: "SUPPORTED",
          nested_ignored: { unsafe: true },
        },
      ],
      articulation: [
        {
          id: "seat_hinge",
          motion: "RIGID",
          pivot_region: "rear edge",
          clearance: ["backrest", "frame"],
        },
      ],
      materials: [
        {
          id: "wood",
          affected_parts: ["seat", "backrest"],
          base_color: "warm brown",
        },
      ],
      animation_guidance: [
        {
          name: "fold",
          type: "ONE_SHOT",
          participants: ["seat"],
        },
      ],
      constraints: [
        "preserve seat opening",
        "do not fill negative space",
      ],
    });

    const result = parseReferencePackage(
      raw,
      "/project/REFERENCE.json",
      "/project"
    );

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      available: true,
      asset_name: "Chair",
      asset_kind: "MODEL",
      selected_profile: "PROP_FURNITURE",
      intent: "build chair",
      requirements: {
        dimensions_blocks: { width: 1, height: 2, length: 1 },
        player_relative_scale: "human scale",
        animation_required: false,
      },
      documents: {
        GEOMETRY: "geometry.md",
        TEXTURE: "texture.md",
      },
      semantic_facts: {
        parts: [
          {
            id: "seat",
            role: "GEOMETRY",
            symmetry: "NONE",
            motion: "STATIC",
            evidence: "SUPPORTED",
          },
        ],
        articulation: [
          {
            id: "seat_hinge",
            motion: "RIGID",
            pivot_region: "rear edge",
            clearance: ["backrest", "frame"],
          },
        ],
        materials: [
          {
            id: "wood",
            affected_parts: ["seat", "backrest"],
            base_color: "warm brown",
          },
        ],
        animation_guidance: [
          {
            name: "fold",
            type: "ONE_SHOT",
            participants: ["seat"],
          },
        ],
        constraints: [
          "preserve seat opening",
          "do not fill negative space",
        ],
      },
    });
    expect(result?.images[0]?.used_by).toEqual(["GEOMETRY", "TEXTURE"]);
    expect(result?.fingerprint).toHaveLength(64);
  });

  test("fingerprint is stable across JSON whitespace and key ordering", () => {
    const first = parseReferencePackage(
      '{"schema":"lazydesigner-reference-v1","asset":{"name":"Chair","kind":"MODEL"}}',
      "/project/REFERENCE.json",
      "/project"
    );
    const second = parseReferencePackage(
      JSON.stringify(
        {
          asset: { kind: "MODEL", name: "Chair" },
          schema: "lazydesigner-reference-v1",
        },
        null,
        4
      ),
      "/project/REFERENCE.json",
      "/project"
    );

    expect(first?.fingerprint).toBe(second?.fingerprint);
  });

  test("projects particle-specific fields only for particle assets", () => {
    const raw = JSON.stringify({
      schema: "lazydesigner-reference-v1",
      asset: { name: "Smoke", kind: "PARTICLE" },
      particle: {
        identifier: "mivubi:smoke",
        particle_json: "smoke.json",
        texture_png: "smoke.png",
        trigger: { intent: "burst", time_seconds: 0.5 },
        bind_to_actor: true,
      },
    });

    const result = parseReferencePackage(
      raw,
      "/project/REFERENCE.json",
      "/project"
    );
    expect(result?.particle).toMatchObject({
      identifier: "mivubi:smoke",
      particle_json: "smoke.json",
      texture_png: "smoke.png",
      trigger_intent: "burst",
      trigger_time_seconds: 0.5,
      bind_to_actor: true,
    });
  });

  test("passes bounded image landmarks into the stage reference contract", () => {
    const doc = {
      schema: "lazydesigner-reference-v1",
      asset: { name: "Lantern", kind: "MODEL" },
      images: [{
        id: "IMG_FRONT", file: "images/front.png",
        view: "front", used_by: ["GEOMETRY"],
        landmarks: [
          { id: "handle", uv: [0.5, 0.1], part_id: "handle" },
          { id: "body", uv: [0.5, 0.55] },
        ],
      }],
    };
    const parsed = parseReferencePackage(JSON.stringify(doc), "/pkg/REFERENCE.json", "/pkg");
    expect(parsed?.images[0].landmarks).toEqual([
      { id: "handle", uv: [0.5, 0.1], part_id: "handle" },
      { id: "body", uv: [0.5, 0.55], part_id: null },
    ]);
    expect(parseReferencePackage(JSON.stringify({
      ...doc,
      images: [{ ...doc.images[0], landmarks: [
        { id: "handle", uv: [0.5, 0.1] },
        { id: "handle", uv: [0.5, 0.9] },
      ] }],
    }), "/pkg/REFERENCE.json", "/pkg")).toBeNull();
    expect(parseReferencePackage(JSON.stringify({
      ...doc,
      images: [{ ...doc.images[0], landmarks: [
        { id: "handle", uv: [1.2, 0.1] },
      ] }],
    }), "/pkg/REFERENCE.json", "/pkg")).toBeNull();
    expect(parseReferencePackage(JSON.stringify({
      ...doc,
      images: [{ ...doc.images[0], view: undefined, landmarks: [
        { id: "handle", uv: [0.5, 0.1] },
      ] }],
    }), "/pkg/REFERENCE.json", "/pkg")).toBeNull();
  });

  test("anchors marked reference image regions to existing semantic parts and one view", () => {
    const model = {
      schema: "lazydesigner-reference-v1",
      asset: { name: "Workbench", kind: "MODEL", profile: "PROP_FURNITURE" },
      parts: [{ id: "frame", role: "GEOMETRY" }, { id: "stripe", role: "TEXTURE" }],
      images: [{
        id: "IMG_FRONT", file: "images/front.png", view: "front",
        used_by: ["GEOMETRY", "TEXTURE"], status: "APPROVED",
        regions: [
          { id: "body", part_id: "frame", evidence_role: "PRIMARY_VOLUME",
            visibility: "DIRECT", box_uv: [0.1, 0.2, 0.9, 0.9] },
          { id: "trim", part_id: "stripe", evidence_role: "SURFACE_DETAIL",
            visibility: "PARTIAL", box_uv: [0.3, 0.4, 0.8, 0.5] },
        ],
      }],
    };
    const parse = (value: unknown) =>
      parseReferencePackage(JSON.stringify(value), "/pkg/REFERENCE.json", "/pkg");
    const result = parse(model);
    expect(result?.images[0]?.regions).toHaveLength(2);
    expect(result?.images[0]?.regions?.[0]).toMatchObject({
      id: "body", part_id: "frame", visibility: "DIRECT",
    });
    expect(parse({ ...model, images: [{ ...model.images[0], view: undefined }] })).toBeNull();
    expect(parse({ ...model, images: [{ ...model.images[0], regions: [
      { ...model.images[0].regions[0], part_id: "unlisted_part" },
    ] }] })).toBeNull();
    expect(parse({ ...model, parts: [{ id: "frame" }, { id: "frame" }] })).toBeNull();
    expect(parse({ ...model, images: [{ ...model.images[0], regions: [
      { ...model.images[0].regions[0], box_uv: [0.9, 0.2, 0.1, 0.8] },
    ] }] })).toBeNull();
    expect(parse({ ...model, images: [{ ...model.images[0], regions: [
      { id: "hidden", part_id: "frame", evidence_role: "PRIMARY_VOLUME",
        visibility: "OCCLUDED", box_uv: null },
    ] }] })?.images[0]?.regions?.[0]?.box_uv).toBeNull();
  });

  test("empty reference keeps a stable unavailable shape", () => {
    expect(emptyReference("REFERENCE_NOT_FOUND")).toMatchObject({
      available: false,
      selected_profile: null,
      documents: {},
      images: [],
      semantic_facts: {
        parts: [],
        articulation: [],
        materials: [],
        animation_guidance: [],
        constraints: [],
      },
      unavailable_reason: "REFERENCE_NOT_FOUND",
    });
  });
});
