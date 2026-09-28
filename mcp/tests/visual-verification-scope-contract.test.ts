import { describe, expect, test } from "bun:test";
import { CAPABILITY_CORE_MANIFEST } from "@/lib/capabilities/manifest";
import {
  BOUNDED_VISUAL_SCOPE_CAPABILITIES,
  verificationScopeForResult,
} from "@/gateway/control/delta/verification";

describe("bounded visual verification scope registry", () => {
  test("every bounded scope capability is canonical and visually verified", () => {
    expect(BOUNDED_VISUAL_SCOPE_CAPABILITIES).toEqual(
      expect.arrayContaining([
        "manage_cubes",
        "manage_animation_timeline",
        "manage_keyframes",
        "paint_texture_transaction",
      ])
    );

    for (const capability of BOUNDED_VISUAL_SCOPE_CAPABILITIES) {
      const entry = CAPABILITY_CORE_MANIFEST.get(capability);
      expect(entry, capability).toBeDefined();
      expect(entry?.verificationClass, capability).toBe("visual");
    }
  });

  test("unsupported visual capabilities remain broad rather than inventing precision", () => {
    expect(
      verificationScopeForResult(
        "animation_graph_editor",
        "visual",
        {
          action: "ease_in",
          affected_count: 4,
        }
      )
    ).toBeNull();
  });

  test("non-visual verification never emits a visual scope", () => {
    expect(
      verificationScopeForResult(
        "manage_keyframes",
        "focused_read",
        {
          animation: { uuid: "anim-a" },
          bone: { uuid: "bone-a" },
          affected_keyframes: [{ time: 0.5 }],
        }
      )
    ).toBeNull();
  });
});
