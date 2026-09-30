import { createResource, type ResourceSpec } from "@/lib/factories";
import {
  TEXTURE_SURFACE_PATTERN_NAMES,
  TEXTURE_SURFACE_PATTERN_RECIPES,
} from "@/lib/texture/surfacePattern";
import { VANILLA_TEXTURE_KNOWLEDGE } from "@/lib/texture/vanillaKnowledge";
import {
  VANILLA_ENTITY_RENDER_MATERIAL_CODES,
  inspectEntityRenderMaterialCode,
} from "@/lib/texture/renderProfile";

const TOPICS = [
  "surface-patterns",
  "vanilla-principles",
  "render-profiles",
  "treatment-plan",
] as const;

type TextureKnowledgeTopic = (typeof TOPICS)[number];

export const textureAuthoringKnowledgeResourceDocs: ResourceSpec = {
  name: "texture-authoring-knowledge",
  uriTemplate: "texture-authoring://{topic}",
  title: "Texture Authoring Knowledge",
  description:
    "On-demand BlockIT texture treatment knowledge: surface-pattern recipes, Vanilla pixel/render principles, known entity render profiles, and treatment-plan structure. Read only the topic needed for the current texture decision.",
};

function isTopic(value: string | undefined): value is TextureKnowledgeTopic {
  return TOPICS.includes(value as TextureKnowledgeTopic);
}

function topicPayload(topic: TextureKnowledgeTopic) {
  if (topic === "surface-patterns") {
    return {
      domain: "surface_pattern",
      purpose:
        "Reference-grounded pixel-language recipes. They never select transparency, glow, PBR, or other runtime behavior.",
      patterns: TEXTURE_SURFACE_PATTERN_NAMES.map((name) =>
        TEXTURE_SURFACE_PATTERN_RECIPES[name]
      ),
    };
  }
  if (topic === "vanilla-principles") {
    return VANILLA_TEXTURE_KNOWLEDGE;
  }
  if (topic === "render-profiles") {
    return {
      domain: "minecraft_entity_render_material",
      purpose:
        "Known Vanilla entity material contracts. Custom codes remain unverified and must not inherit semantics by name.",
      profiles: VANILLA_ENTITY_RENDER_MATERIAL_CODES.map((code) =>
        inspectEntityRenderMaterialCode(code)
      ),
    };
  }
  return {
    domain: "texture_treatment_plan",
    purpose:
      "Compact reasoning contract before broad painting; use approved reference evidence and leave unknowns unresolved.",
    region_fields: [
      "region",
      "evidence: observed | inferred | unknown",
      "surface_pattern",
      "render_profile or minecraft_material_code",
      "optional pbr_intent",
      "identity_colors / notes",
    ],
    passes: [
      "BASE PASS",
      "VALUE / FORM PASS",
      "SURFACE PATTERN PASS",
      "IDENTITY PASS",
      "SECONDARY DETAIL PASS",
      "RENDER / ALPHA VERIFY",
      "MAPPED MODEL VERIFY",
    ],
    invariants: [
      "surface_pattern never selects render_profile",
      "render_profile never selects surface_pattern",
      "PBR is optional and explicit",
      "unknown reference evidence remains review_required",
      "no similarity or quality score",
    ],
  };
}

createResource(textureAuthoringKnowledgeResourceDocs.name, {
  uriTemplate: textureAuthoringKnowledgeResourceDocs.uriTemplate,
  title: textureAuthoringKnowledgeResourceDocs.title,
  description: textureAuthoringKnowledgeResourceDocs.description,
  async listCallback() {
    return {
      resources: TOPICS.map((topic) => ({
        uri: `texture-authoring://${topic}`,
        name: topic,
        description: `Read ${topic} only when that texture-authoring knowledge is needed.`,
        mimeType: "application/json",
      })),
    };
  },
  async readCallback(uri, { topic }) {
    const value = typeof topic === "string" ? topic : undefined;
    if (!isTopic(value)) {
      throw new Error(
        `Unknown texture-authoring topic "${String(value)}". Available: ${TOPICS.join(", ")}.`
      );
    }
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(topicPayload(value), null, 2),
          mimeType: "application/json",
        },
      ],
    };
  },
});