import { classifyMcpToolPhaseByName } from "../lib/authoringPhase";
import { getCapabilityMetadata } from "../lib/capabilityMetadata";
import type { BackendTool } from "./contract";

export type CapabilityBranchHint = {
  field: string;
  value: string;
};

export type CapabilityRoutingContext = {
  authoringPhase?: "geometry" | "texturing" | "animation" | null;
};

export type CapabilitySemanticEntry = {
  capability: string;
  branch?: CapabilityBranchHint;
  intents: readonly string[];
  nouns?: readonly string[];
  verbs?: readonly string[];
  requires?: readonly string[];
  effects?: readonly string[];
  excludes?: readonly string[];
  examples?: readonly string[];
};

export type CapabilitySemanticMatch = {
  capability: string;
  branch?: CapabilityBranchHint;
  score: number;
  matched: boolean;
  reason: string;
};

const SEMANTICS: readonly CapabilitySemanticEntry[] = [
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "create" },
    intents: ["create cube geometry", "build model part", "add cuboid"],
    nouns: ["cube", "geometry", "body", "part", "limb", "block"],
    verbs: ["create", "add", "build", "make"],
    effects: ["geometry"],
    excludes: ["texture", "uv", "animation"],
    examples: ["make four table legs", "add a cube for the head"],
  },
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "update" },
    intents: ["adjust proportions", "resize existing geometry", "move cube", "rotate cube", "correct model shape"],
    nouns: ["cube", "geometry", "part", "body", "limb", "leg", "head"],
    verbs: ["resize", "adjust", "lengthen", "shorten", "move", "rotate", "scale", "thicken", "narrow"],
    requires: ["existing cube"],
    effects: ["geometry"],
    excludes: ["reparent", "rename", "uv", "texture"],
    examples: ["make the chair leg taller", "reduce the head width"],
  },
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "batch_update" },
    intents: ["edit many cubes", "batch geometry correction", "repeat geometry changes"],
    nouns: ["cubes", "geometry", "parts"],
    verbs: ["batch", "multiple", "all", "several", "repeat"],
    requires: ["existing cubes"],
    effects: ["geometry"],
  },
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "simplify" },
    intents: ["simplify geometry", "reduce cube complexity", "clean geometry"],
    nouns: ["geometry", "cube", "model"],
    verbs: ["simplify", "reduce", "clean", "optimize"],
    effects: ["geometry"],
  },
  {
    capability: "inspect_elements",
    branch: { field: "mode", value: "search" },
    intents: ["find model element", "locate cube or group", "search hierarchy"],
    nouns: ["cube", "group", "bone", "element", "part"],
    verbs: ["find", "search", "locate", "identify"],
    effects: ["read"],
  },
  {
    capability: "inspect_elements",
    branch: { field: "mode", value: "detail" },
    intents: ["inspect exact element", "read element dimensions", "inspect cube state"],
    nouns: ["cube", "group", "bone", "element", "part"],
    verbs: ["inspect", "check", "read", "measure"],
    requires: ["element id"],
    effects: ["read"],
  },
  {
    capability: "inspect_model_bounds",
    intents: ["measure model bounds", "check total size", "inspect dimensions"],
    nouns: ["model", "bounds", "size", "dimensions"],
    verbs: ["measure", "check", "inspect"],
    effects: ["read"],
  },
  {
    capability: "capture_model_views",
    intents: ["capture model view", "visual verification", "take preview", "inspect appearance"],
    nouns: ["model", "view", "preview", "image", "camera"],
    verbs: ["capture", "preview", "verify", "see"],
    effects: ["visual evidence"],
  },
  {
    capability: "reparent_element",
    intents: ["change hierarchy parent", "move element to bone", "reparent bone"],
    nouns: ["parent", "bone", "group", "hierarchy", "element"],
    verbs: ["reparent", "parent", "unparent", "move"],
    requires: ["existing element"],
    effects: ["hierarchy"],
    excludes: ["resize", "texture"],
  },
  {
    capability: "modify_group",
    intents: ["adjust bone pivot", "move group", "edit group transform"],
    nouns: ["group", "bone", "pivot"],
    verbs: ["pivot", "move", "adjust", "modify"],
    effects: ["geometry", "hierarchy"],
  },
  {
    capability: "manage_uv_layout",
    branch: { field: "operation", value: "plan" },
    intents: ["plan uv layout", "pack uv islands", "fix uv overlap", "set texel density"],
    nouns: ["uv", "island", "atlas", "texel", "padding"],
    verbs: ["plan", "pack", "repack", "arrange", "layout"],
    requires: ["geometry"],
    effects: ["uv plan"],
    examples: ["pack the UV islands without overlap"],
  },
  {
    capability: "manage_uv_layout",
    branch: { field: "operation", value: "apply" },
    intents: ["apply uv plan", "commit uv layout"],
    nouns: ["uv", "layout", "plan"],
    verbs: ["apply", "commit", "use"],
    requires: ["uv plan"],
    effects: ["uv layout"],
  },
  {
    capability: "create_texture",
    branch: { field: "type", value: "blank" },
    intents: ["create blank texture", "new empty texture"],
    nouns: ["texture", "image", "atlas"],
    verbs: ["create", "new", "blank"],
    effects: ["texture"],
  },
  {
    capability: "create_texture",
    branch: { field: "type", value: "template" },
    intents: ["create texture from template", "generate texture atlas from model"],
    nouns: ["texture", "template", "atlas"],
    verbs: ["create", "generate", "template"],
    effects: ["texture", "uv"],
  },
  {
    capability: "create_texture",
    branch: { field: "type", value: "variant" },
    intents: ["create texture variant", "duplicate texture variant"],
    nouns: ["texture", "variant"],
    verbs: ["variant", "duplicate", "derive"],
    requires: ["source texture"],
    effects: ["texture"],
  },
  {
    capability: "gradient_tool",
    intents: ["paint gradient", "shade with gradient", "automatic color transition"],
    nouns: ["texture", "gradient", "color", "shade"],
    verbs: ["gradient", "shade", "blend", "transition"],
    effects: ["texture"],
  },
  {
    capability: "paint_texture_transaction",
    intents: ["exact pixel edit", "atomic texture edit", "revision protected paint"],
    nouns: ["texture", "pixel", "pixels"],
    verbs: ["paint", "edit", "replace", "set"],
    effects: ["texture"],
  },
  {
    capability: "paint_with_brush",
    intents: ["paint texture with brush", "brush stroke", "manual texture stroke"],
    nouns: ["texture", "brush", "stroke", "paint"],
    verbs: ["paint", "brush", "draw"],
    effects: ["texture"],
  },
  {
    capability: "manage_material",
    branch: { field: "operation", value: "create" },
    intents: ["create pbr material", "new material"],
    nouns: ["material", "pbr", "normal", "mer", "height"],
    verbs: ["create", "new"],
    effects: ["material"],
  },
  {
    capability: "manage_material",
    branch: { field: "operation", value: "configure" },
    intents: ["configure material", "change pbr channels", "edit material"],
    nouns: ["material", "pbr", "normal", "mer", "height"],
    verbs: ["configure", "edit", "change", "adjust"],
    effects: ["material"],
  },
  {
    capability: "manage_render_profile",
    branch: { field: "operation", value: "bind" },
    intents: ["bind render profile", "set render material profile"],
    nouns: ["render", "profile", "material", "alpha"],
    verbs: ["bind", "set", "configure"],
    effects: ["render profile"],
  },
  {
    capability: "create_animation",
    intents: ["create animation", "new animation", "add animation clip"],
    nouns: ["animation", "clip"],
    verbs: ["create", "new", "add"],
    effects: ["animation"],
  },
  {
    capability: "manage_animation_timeline",
    intents: ["edit keyframe", "animation timeline", "change easing", "bone animation"],
    nouns: ["animation", "timeline", "keyframe", "easing", "bone"],
    verbs: ["edit", "add", "change", "animate"],
    effects: ["animation"],
  },
  {
    capability: "manage_animation_effects",
    intents: ["add animation sound", "add animation particle", "timeline event"],
    nouns: ["animation", "sound", "particle", "effect", "event"],
    verbs: ["add", "edit", "trigger"],
    effects: ["animation effects"],
  },
  {
    capability: "manage_animation_controller",
    intents: ["edit animation controller", "state machine", "animation transition"],
    nouns: ["controller", "state", "transition", "animation"],
    verbs: ["create", "edit", "transition", "blend"],
    effects: ["animation controller"],
  },
  {
    capability: "inspect_particle",
    intents: ["inspect particle", "read particle emitter"],
    nouns: ["particle", "emitter"],
    verbs: ["inspect", "read", "check"],
    effects: ["read"],
  },
  {
    capability: "manage_particle",
    intents: ["create particle", "edit particle emitter", "change particle"],
    nouns: ["particle", "emitter", "snowstorm"],
    verbs: ["create", "edit", "change", "configure"],
    effects: ["particle"],
  },
];

const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  proportions: ["size", "dimensions", "scale", "length", "width", "height", "thickness"],
  resize: ["scale", "dimensions", "proportions", "bigger", "smaller", "taller", "shorter", "wider", "narrower"],
  taller: ["resize", "lengthen", "height", "proportions"],
  shorter: ["resize", "shorten", "height", "proportions"],
  wider: ["resize", "width", "proportions"],
  narrower: ["resize", "width", "proportions"],
  move: ["position", "translate", "shift", "geser"],
  rotate: ["rotation", "turn"],
  texture: ["paint", "color", "colour", "pixel", "material"],
  gradient: ["shade", "blend", "transition"],
  uv: ["mapping", "unwrap", "island", "atlas", "texel"],
  animation: ["animate", "timeline", "keyframe", "motion"],
  hierarchy: ["parent", "reparent", "bone", "group"],
  under: ["parent", "reparent", "hierarchy"],
  child: ["parent", "reparent", "hierarchy"],
  inspect: ["check", "read", "measure", "find"],
  create: ["add", "make", "build", "new"],
};

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function expandedTokens(query: string): Set<string> {
  const base = normalize(query);
  const out = new Set(base);
  for (const token of base) {
    for (const synonym of SYNONYMS[token] ?? []) {
      for (const expanded of normalize(synonym)) out.add(expanded);
    }
  }
  return out;
}

function entryText(entry: CapabilitySemanticEntry): {
  intent: Set<string>;
  noun: Set<string>;
  verb: Set<string>;
  exclude: Set<string>;
  example: Set<string>;
} {
  return {
    intent: new Set(normalize(entry.intents.join(" "))),
    noun: new Set(normalize((entry.nouns ?? []).join(" "))),
    verb: new Set(normalize((entry.verbs ?? []).join(" "))),
    exclude: new Set(normalize((entry.excludes ?? []).join(" "))),
    example: new Set(normalize((entry.examples ?? []).join(" "))),
  };
}

function overlap(tokens: Set<string>, field: Set<string>, weight: number): number {
  let value = 0;
  for (const token of tokens) if (field.has(token)) value += weight;
  return value;
}

function phaseBoost(capability: string, context?: CapabilityRoutingContext): number {
  const active = context?.authoringPhase;
  if (!active) return 0;
  const phase = classifyMcpToolPhaseByName(capability);
  if (!phase) return 2;
  return phase === active ? 18 : -8;
}

function genericCapabilityScore(
  tool: BackendTool,
  tokens: Set<string>,
  context?: CapabilityRoutingContext
): number {
  const metadata = getCapabilityMetadata(tool.name);
  const name = new Set(normalize(tool.name.replace(/[_.\/-]+/g, " ")));
  const description = new Set(normalize(tool.description ?? ""));
  const aliases = new Set(normalize(metadata.searchAliases.join(" ")));

  let score = overlap(tokens, name, 14);
  score += overlap(tokens, aliases, 10);
  score += overlap(tokens, description, 4);
  return score;
}

export function semanticMatchesForTool(
  tool: BackendTool,
  query: string,
  context?: CapabilityRoutingContext
): CapabilitySemanticMatch[] {
  const queryTokens = expandedTokens(query);
  const entries = SEMANTICS.filter((entry) => entry.capability === tool.name);

  if (entries.length === 0) {
    const evidence = genericCapabilityScore(tool, queryTokens, context);
    return [{
      capability: tool.name,
      score: evidence + phaseBoost(tool.name, context),
      matched: evidence > 0,
      reason: evidence > 0 ? "capability metadata match" : "no semantic match",
    }];
  }

  return entries.map((entry) => {
    const text = entryText(entry);
    const genericEvidence = genericCapabilityScore(tool, queryTokens, context);
    const intentEvidence = overlap(queryTokens, text.intent, 12);
    const verbEvidence = overlap(queryTokens, text.verb, 9);
    const nounEvidence = overlap(queryTokens, text.noun, 7);
    const exampleEvidence = overlap(queryTokens, text.example, 5);
    const positiveEvidence =
      genericEvidence + intentEvidence + verbEvidence + nounEvidence + exampleEvidence;
    let score = positiveEvidence;
    score -= overlap(queryTokens, text.exclude, 12);
    if (positiveEvidence > 0) score += phaseBoost(tool.name, context);

    const reasonParts: string[] = [];
    if (overlap(queryTokens, text.intent, 1) > 0) reasonParts.push("intent");
    if (overlap(queryTokens, text.verb, 1) > 0) reasonParts.push("action");
    if (overlap(queryTokens, text.noun, 1) > 0) reasonParts.push("object");
    if (
      positiveEvidence > 0 &&
      context?.authoringPhase &&
      phaseBoost(tool.name, context) > 0
    ) {
      reasonParts.push("active phase");
    }

    return {
      capability: entry.capability,
      ...(entry.branch ? { branch: entry.branch } : {}),
      score,
      matched: positiveEvidence > 0,
      reason: reasonParts.length > 0 ? reasonParts.join("+") : "no semantic match",
    };
  });
}

export function bestSemanticMatchForTool(
  tool: BackendTool,
  query: string,
  context?: CapabilityRoutingContext
): CapabilitySemanticMatch {
  return semanticMatchesForTool(tool, query, context)
    .sort((a, b) => b.score - a.score)[0]!;
}

export function listCapabilitySemantics(): readonly CapabilitySemanticEntry[] {
  return SEMANTICS;
}
