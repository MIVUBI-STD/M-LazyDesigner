import { describe, expect, test } from "bun:test";
import { paintTransactionParameters } from "@/lib/paintTransaction";
import {
  BEDROCK_PARTICLE_RESOURCE_LAYOUT,
  isCanonicalParticleTextureReference,
  particleTextureOutputMatchesReference,
} from "@/lib/particleResourceLayout";
import { manageAnimationEffectsParameters } from "@/server/tools/animation-effects";
import { particleToolDocs } from "@/server/tools/particle";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

const TEST_TEXTURE_REVISION = `sha256:1x1:${"a".repeat(64)}`;

describe("particle end-to-end static contract", () => {
  test("keeps one canonical Bedrock particle resource layout", () => {
    expect(BEDROCK_PARTICLE_RESOURCE_LAYOUT).toEqual({
      particle_directory: "particles",
      texture_directory: "textures/particle",
      particle_suffix: ".particle.json",
      texture_suffix: ".png",
    });
    expect(isCanonicalParticleTextureReference("textures/particle/dust_hit")).toBe(true);
    expect(isCanonicalParticleTextureReference("textures/entity/dust_hit")).toBe(false);
    expect(
      particleTextureOutputMatchesReference(
        "textures/particle/dust_hit",
        "C:\\packs\\demo\\textures\\particle\\dust_hit.png"
      )
    ).toBe(true);
  });

  test("existing paint transaction owns optional final PNG output", () => {
    const valid = paintTransactionParameters.safeParse({
      expected_revision: TEST_TEXTURE_REVISION,
      operations: [
        {
          operation: "set_pixels",
          color: "#ffffffff",
          coordinates: [{ x: 0, y: 0 }],
        },
      ],
      output: {
        path: "/packs/demo/textures/particle/dust_hit.png",
      },
    });
    const relative = paintTransactionParameters.safeParse({
      expected_revision: TEST_TEXTURE_REVISION,
      operations: [
        {
          operation: "set_pixels",
          color: "#ffffffff",
          coordinates: [{ x: 0, y: 0 }],
        },
      ],
      output: { path: "textures/particle/dust_hit.png" },
    });

    expect(valid.success).toBe(true);
    expect(relative.success).toBe(false);
  });

  test("particle binding remains owned by existing animation effects with explicit time and locator", () => {
    const parsed = manageAnimationEffectsParameters.safeParse({
      animation_id: "animation.demo.hoe",
      operations: [
        {
          operation: "add",
          channel: "particle",
          time: 0.42,
          effect: "blockit:dust_hit",
          locator: "hoe_tip",
          bind_to_actor: true,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  test("particle surface stays focused and texture save rollback is explicit", async () => {
    expect(particleToolDocs.map((tool) => tool.name)).toEqual([
      "inspect_particle",
      "manage_particle",
    ]);

    const wiring = await source("server/tools/paint-texture-transaction.ts");
    expect(wiring).toContain("commitTexturePngWrite");
    expect(wiring).toContain("rollbackTexturePngWrite");
    expect(wiring).toContain("Undo.cancelEdit(true)");
    expect(wiring).not.toContain("create_particle_texture");
  });
});
