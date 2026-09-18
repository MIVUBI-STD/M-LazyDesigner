import { describe, expect, test } from "bun:test";
import "@/server/server";
import "@/server/resources";
import "@/server/resources/texture-authoring-knowledge";
import {
  getAllToolDefinitions,
  resources,
} from "@/lib/factories";
import { DEFAULT_MCP_REGISTRATION_PROFILE } from "@/lib/registrationProfile";
import { MCP_AUTHORING_PHASES } from "@/lib/authoringPhase";
import {
  getMcpSurfaceToolNames,
  getToolRegistrationFamily,
  isCatalogToolEnabled,
  tools,
} from "@/server/tools";
import { toolManifest, resourceDocs } from "@/build/docs-manifest";
import { particleToolDocs } from "@/server/tools/particle";
import { particleReferenceResourceDocs } from "@/server/resources/particle";

function enabledCatalogNames(): string[] {
  return Object.keys(tools)
    .filter((name) => isCatalogToolEnabled(name))
    .sort((a, b) => a.localeCompare(b));
}

function documentedToolNames(): Set<string> {
  return new Set(
    toolManifest.flatMap((group) => group.tools.map((tool) => tool.name))
  );
}

describe("MCP surface closure", () => {
  test("every enabled default capability is family-owned and reachable from at least one semantic surface", () => {
    const phaseUnion = new Set(
      MCP_AUTHORING_PHASES.flatMap((phase) =>
        getMcpSurfaceToolNames(DEFAULT_MCP_REGISTRATION_PROFILE, phase)
      )
    );
    const enabled = enabledCatalogNames();

    expect([...phaseUnion].sort((a, b) => a.localeCompare(b))).toEqual(enabled);
    for (const name of enabled) {
      expect(getToolRegistrationFamily(name), `${name} has no registration family`).toBeDefined();
      expect(
        getAllToolDefinitions()[name],
        `${name} has no executable runtime definition`
      ).toBeDefined();
    }
  });

  test("runtime augmentation owners remain wired through the canonical capabilities", () => {
    const definitions = getAllToolDefinitions() as Record<
      string,
      { inputSchema: Record<string, unknown> }
    >;
    const requiredFields: Record<string, readonly string[]> = {
      create_texture: ["source_texture_id"],
      get_texture: ["expected_revision", "region"],
      capture_model_views: ["animation_preview"],
      inspect_animation: ["diagnostics", "channel", "time_range"],
      manage_animation_timeline: ["anim_time_update", "rotation_spaces"],
      manage_animation_controller: ["native_operations"],
    };

    for (const [name, fields] of Object.entries(requiredFields)) {
      const definition = definitions[name];
      expect(definition, `${name} runtime definition missing`).toBeDefined();
      for (const field of fields) {
        expect(
          definition?.inputSchema[field],
          `${name} lost runtime augmentation field ${field}`
        ).toBeDefined();
      }
    }

    expect(definitions.paint_texture_transaction).toBeDefined();
    expect(definitions.manage_render_profile).toBeDefined();
  });

  test("every callable capability has canonical ToolSpec coverage", () => {
    const documented = documentedToolNames();
    const undocumentedEnabled = enabledCatalogNames().filter(
      (name) => !documented.has(name)
    );
    expect(undocumentedEnabled).toEqual([]);
  });

  test("Particle production exposure is all-or-nothing across runtime, phase, docs and resource wiring", () => {
    const particleNames = particleToolDocs
      .map((tool) => tool.name)
      .sort((a, b) => a.localeCompare(b));
    const registeredParticleNames = particleNames.filter((name) =>
      Object.hasOwn(tools, name)
    );
    expect(registeredParticleNames).toEqual(particleNames);

    const documented = documentedToolNames();
    const documentedParticleNames = particleNames.filter((name) =>
      documented.has(name)
    );
    const particleResourceName = particleReferenceResourceDocs[0]?.name;
    expect(particleResourceName).toBe("particle-reference");

    const resourceDeclared = resourceDocs.some(
      (resource) => resource.name === particleResourceName
    );
    const resourceRegistered = Boolean(
      particleResourceName && resources[particleResourceName]
    );

    expect(documentedParticleNames).toEqual(particleNames);
    expect(resourceDeclared).toBe(true);
    expect(resourceRegistered).toBe(true);

    const animation = new Set(
      getMcpSurfaceToolNames(DEFAULT_MCP_REGISTRATION_PROFILE, "animation")
    );
    const geometry = new Set(
      getMcpSurfaceToolNames(DEFAULT_MCP_REGISTRATION_PROFILE, "geometry")
    );
    const texturing = new Set(
      getMcpSurfaceToolNames(DEFAULT_MCP_REGISTRATION_PROFILE, "texturing")
    );
    for (const name of particleNames) {
      expect(isCatalogToolEnabled(name)).toBe(true);
      expect(animation.has(name)).toBe(true);
      expect(geometry.has(name)).toBe(false);
      expect(texturing.has(name)).toBe(false);
    }
  });
});
