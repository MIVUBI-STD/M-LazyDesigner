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

  test("empty reference keeps a stable unavailable shape", () => {
    expect(emptyReference("REFERENCE_NOT_FOUND")).toMatchObject({
      available: false,
      selected_profile: null,
      documents: {},
      images: [],
      unavailable_reason: "REFERENCE_NOT_FOUND",
    });
  });
});
