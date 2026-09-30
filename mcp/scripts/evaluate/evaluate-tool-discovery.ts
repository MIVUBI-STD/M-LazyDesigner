import "@/server/tools";
import { getEnabledToolDefinitions } from "@/lib/factories";
import { MCP_SERVER_INSTRUCTIONS } from "@/server/server";

export const CODEX_TOOL_SEARCH_REFERENCE = {
  commit: "4ef836f883c38ba6d39e6920f335ce6452b7de33",
  default_limit: 8,
  corpus_fields: [
    "flat tool name",
    "callable/raw tool name",
    "server name",
    "title",
    "description",
    "namespace description",
    "top-level input schema property names",
  ],
  ranking: "BM25",
} as const;

type ToolDiscoveryCase = { expected: string; query: string };
type CorpusEntry = { name: string; search_text: string };
type RankedTool = { name: string; score: number };
type CollisionPair = {
  expected: string;
  actual: string;
  count: number;
  examples: string[];
};
type Top8Miss = {
  query: string;
  expected: string;
  rank: number;
  top_results: Array<{ name: string; score: number }>;
};

export type ToolDiscoveryEvalReport = {
  proxy: "codex_mcp_bm25_static_proxy";
  proxy_note: string;
  upstream_reference: typeof CODEX_TOOL_SEARCH_REFERENCE;
  enabled_tool_count: number;
  expected_tool_count: number;
  case_count: number;
  missing_expected_tools: string[];
  metrics: {
    top_1_accuracy: number;
    top_3_recall: number;
    top_8_recall: number;
    mean_reciprocal_rank: number;
  };
  collision_pairs: CollisionPair[];
  top_8_misses: Top8Miss[];
};

const TOOL_DISCOVERY_INTENT_GROUPS = [
  [
    "create_project",
    "start a new Minecraft Bedrock entity project",
    "make a fresh Blockbench project for a Bedrock entity",
  ],
  [
    "get_project_info",
    "what project is open and what is its format",
    "show the current project resolution and element counts",
  ],
  [
    "inspect_model_bounds",
    "measure the model bounding box and dimensions",
    "check the rendered width height length and ground bounds",
  ],
  [
    "manage_cubes",
    "add a new cube to the Bedrock model",
    "create cube geometry from explicit coordinates",
  ],
  [
    "manage_cubes",
    "resize one existing cube by uuid",
    "move and rotate this known existing cube",
  ],
  [
    "manage_cubes",
    "move several known cube uuids together",
    "batch resize multiple existing cubes in one correction",
  ],
  [
    "add_group",
    "create a new Bedrock bone group",
    "add a bone under this parent group",
  ],
  [
    "inspect_elements",
    "find cubes whose name contains arm",
    "search groups by parent and size criteria",
  ],
  [
    "inspect_elements",
    "show the cube and group hierarchy",
    "list the model outliner tree",
  ],
  [
    "inspect_elements",
    "show the exact transform of this known cube uuid",
    "inspect one known locator authored state by uuid",
  ],
  [
    "capture_model_views",
    "capture front side and top model views",
    "take deterministic reference views of the model",
  ],
  [
    "list_locator_elements",
    "list locator and null object identities",
    "show locator names types and parents",
  ],
  [
    "manage_locator",
    "create a locator under this bone",
    "move and rotate an existing locator",
  ],
  [
    "manage_null_object",
    "create a null object under this group",
    "move an existing null object to a new position",
  ],
  ["undo", "undo the last edit", "revert the previous two edits"],
  ["redo", "redo the change I just undid", "reapply two undone edits"],
  [
    "get_undo_stack",
    "show recent undo and redo history",
    "what edits are currently available in the undo stack",
  ],
  [
    "export_model",
    "export the model as Bedrock geometry json",
    "save an editable bbmodel project file",
  ],
  [
    "create_texture",
    "create a new 64 by 64 texture",
    "make a texture from an image file",
  ],
  [
    "list_textures",
    "list texture identities in the project",
    "show all textures and their groups",
  ],
  [
    "get_texture",
    "read the pixels of this texture",
    "return image data for the active texture",
  ],
  [
    "activate_texture",
    "make this texture active for painting",
    "select the default working texture",
  ],
  [
    "manage_material",
    "create a new PBR material texture group",
    "make a material with color normal and MER sources",
  ],
  [
    "manage_material",
    "edit an existing PBR material",
    "change this material from a normal texture to a height texture",
  ],
  [
    "list_materials",
    "list all PBR materials",
    "show material texture groups and assigned channels",
  ],
  [
    "get_material_info",
    "inspect one material and its texture set preview",
    "show detailed PBR information for this material",
  ],
  [
    "manage_material",
    "assign this texture to the normal channel",
    "set the MER texture on this material",
  ],
  [
    "import_texture_set",
    "import an existing texture set json file",
    "load a Bedrock texture_set configuration",
  ],
  [
    "manage_material",
    "save this material texture set json",
    "write the PBR material config to disk",
  ],
  [
    "paint_fill_tool",
    "bucket fill this texture area with color",
    "flood fill connected pixels on the texture",
  ],
  [
    "draw_shape_tool",
    "draw a rectangle on the texture",
    "draw a hollow ellipse shape",
  ],
  [
    "gradient_tool",
    "paint a gradient across the texture",
    "apply a color gradient from one point to another",
  ],
  [
    "color_picker_tool",
    "pick the pixel color from this texture",
    "sample a color at these texture coordinates",
  ],
  [
    "eraser_tool",
    "erase pixels along these coordinates",
    "use an eraser brush on the texture",
  ],
  [
    "paint_with_brush",
    "paint these pixels with a brush stroke",
    "draw on the texture using brush settings",
  ],
  [
    "paint_texture_transaction",
    "atomically paint exact texture pixels with revision protection",
    "apply several exact pixel edits as one undo transaction",
  ],
  [
    "texture_selection",
    "select a rectangular area of the texture",
    "invert the current texture selection",
  ],
  [
    "texture_layer_management",
    "create a new texture layer",
    "merge rename or move texture layers",
  ],
  [
    "inspect_animation",
    "inspect authored keyframes for this animation",
    "show animation bones and particle effect summary",
  ],
  [
    "create_animation",
    "create a new walk animation",
    "make a looping Bedrock animation",
  ],
  [
    "manage_animation_controller",
    "create a Bedrock animation controller state machine",
    "add controller states transitions and animation links",
  ],
  [
    "manage_animation_effects",
    "add particle sound or timeline effect keyframes to an existing animation",
    "update or remove an authored animation effect by keyframe identity",
  ],
  [
    "manage_animation_timeline",
    "add a rotation keyframe to this bone",
    "edit keyframe values at this time",
  ],
  [
    "manage_animation_timeline",
    "change keyframe easing to ease in out",
    "adjust Bezier interpolation handles",
  ],
  [
    "reparent_element",
    "reparent this bone under another bone",
  ],
  [
    "modify_group",
    "set the pivot of this animation bone",
  ],
  [
    "bone_rigging",
    "enable ik on this bone and set its target",
    "mirror this bone across the x axis",
  ],
  [
    "manage_animation_timeline",
    "scrub animation time to two seconds",
    "play or loop the animation timeline",
  ],
  [
    "manage_animation_timeline",
    "offset several keyframes in time",
    "scale the timing of selected keyframes",
  ],
  [
    "manage_animation_timeline",
    "copy keyframes from one bone to another",
    "mirror paste animation data",
  ],
  [
    "manage_material_instances",
    "list material instance names and usage counts",
    "show all face material instances without detailed usages",
  ],
  [
    "manage_material_instances",
    "read material instances on this cube faces",
    "which material name is assigned to the north face",
  ],
  [
    "manage_material_instances",
    "set one material instance on these cube faces",
    "assign a material name to the north and south faces",
  ],
  [
    "manage_material_instances",
    "assign different material instances across several cubes",
    "bulk set face material names on multiple cubes",
  ],
  [
    "manage_material_instances",
    "clear material instances from this cube",
    "remove all face material instance names",
  ],
] as const;

export const TOOL_DISCOVERY_CASES: ToolDiscoveryCase[] =
  TOOL_DISCOVERY_INTENT_GROUPS.flatMap(([expected, ...queries]) =>
    queries.map((query) => ({ expected, query }))
  );

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "use",
  "using",
  "what",
  "which",
  "with",
]);

function stem(token: string): string {
  if (token.length > 5 && token.endsWith("ies")) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.length > 5 && token.endsWith("ing")) {
    return token.slice(0, -3);
  }
  if (token.length > 4 && token.endsWith("ed")) {
    return token.slice(0, -2);
  }
  if (token.length > 4 && token.endsWith("es")) {
    return token.slice(0, -2);
  }
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().replaceAll("_", " ").match(/[a-z0-9]+/g) ?? [])
    .filter((token) => !STOP_WORDS.has(token))
    .map(stem)
    .filter((token) => token.length > 1);
}

export function buildToolSearchCorpus(): CorpusEntry[] {
  const definitions = getEnabledToolDefinitions();
  return Object.entries(definitions)
    .map(([name, definition]) => {
      const topLevelProperties = Object.keys(definition.inputSchema).sort();
      return {
        name,
        search_text: [
          `mcp__blockit__${name}`,
          name,
          name,
          "BlockIT",
          definition.title,
          definition.description,
          MCP_SERVER_INSTRUCTIONS,
          ...topLevelProperties,
        ]
          .filter(
            (part): part is string =>
              typeof part === "string" && part.length > 0
          )
          .join(" "),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function rankTools(query: string, corpus: CorpusEntry[]): RankedTool[] {
  const tokenizedDocuments = corpus.map((entry) => tokenize(entry.search_text));
  const documentFrequencies = new Map<string, number>();
  for (const tokens of tokenizedDocuments) {
    for (const token of new Set(tokens)) {
      documentFrequencies.set(token, (documentFrequencies.get(token) ?? 0) + 1);
    }
  }

  const averageDocumentLength =
    tokenizedDocuments.reduce((sum, tokens) => sum + tokens.length, 0) /
    Math.max(tokenizedDocuments.length, 1);
  const queryTokens = [...new Set(tokenize(query))];
  const k1 = 1.2;
  const b = 0.75;
  const documentCount = corpus.length;

  return corpus
    .map((entry, documentIndex) => {
      const tokens = tokenizedDocuments[documentIndex] ?? [];
      const termFrequencies = new Map<string, number>();
      for (const token of tokens) {
        termFrequencies.set(token, (termFrequencies.get(token) ?? 0) + 1);
      }

      let score = 0;
      for (const token of queryTokens) {
        const frequency = termFrequencies.get(token) ?? 0;
        if (frequency === 0) continue;
        const documentFrequency = documentFrequencies.get(token) ?? 0;
        const inverseDocumentFrequency = Math.log(
          1 +
            (documentCount - documentFrequency + 0.5) /
              (documentFrequency + 0.5)
        );
        const lengthNormalization =
          1 - b + b * (tokens.length / Math.max(averageDocumentLength, 1));
        score +=
          inverseDocumentFrequency *
          ((frequency * (k1 + 1)) /
            (frequency + k1 * lengthNormalization));
      }
      return { name: entry.name, score };
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.name.localeCompare(right.name)
    );
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

export function evaluateToolDiscovery(): ToolDiscoveryEvalReport {
  const corpus = buildToolSearchCorpus();
  const corpusNames = new Set(corpus.map((entry) => entry.name));
  const expectedTools = [
    ...new Set(TOOL_DISCOVERY_CASES.map((entry) => entry.expected)),
  ];
  const missingExpectedTools = expectedTools
    .filter((name) => !corpusNames.has(name))
    .sort();

  let top1 = 0;
  let top3 = 0;
  let top8 = 0;
  let reciprocalRankTotal = 0;
  const collisionMap = new Map<string, CollisionPair>();
  const top8Misses: Top8Miss[] = [];

  for (const testCase of TOOL_DISCOVERY_CASES) {
    const ranked = rankTools(testCase.query, corpus);
    const rankIndex = ranked.findIndex(
      (candidate) => candidate.name === testCase.expected
    );
    const rank = rankIndex >= 0 ? rankIndex + 1 : corpus.length + 1;
    const actual = ranked[0]?.name ?? "<none>";

    if (rank === 1) top1 += 1;
    if (rank <= 3) top3 += 1;
    if (rank <= CODEX_TOOL_SEARCH_REFERENCE.default_limit) top8 += 1;
    reciprocalRankTotal += 1 / rank;

    if (actual !== testCase.expected) {
      const key = `${testCase.expected}\u0000${actual}`;
      const collision = collisionMap.get(key) ?? {
        expected: testCase.expected,
        actual,
        count: 0,
        examples: [],
      };
      collision.count += 1;
      if (collision.examples.length < 3) collision.examples.push(testCase.query);
      collisionMap.set(key, collision);
    }

    if (rank > CODEX_TOOL_SEARCH_REFERENCE.default_limit) {
      top8Misses.push({
        query: testCase.query,
        expected: testCase.expected,
        rank,
        top_results: ranked
          .slice(0, CODEX_TOOL_SEARCH_REFERENCE.default_limit)
          .map(({ name, score }) => ({
            name,
            score: Number(score.toFixed(4)),
          })),
      });
    }
  }

  const caseCount = TOOL_DISCOVERY_CASES.length;
  const collisionPairs = [...collisionMap.values()].sort(
    (left, right) =>
      right.count - left.count ||
      left.expected.localeCompare(right.expected) ||
      left.actual.localeCompare(right.actual)
  );

  return {
    proxy: "codex_mcp_bm25_static_proxy",
    proxy_note:
      "Dependency-free static proxy over current BuildIT MCP metadata, aligned to inspected upstream Codex MCP search fields and default limit. It is not installed-client proof and does not reproduce the exact upstream tokenizer implementation.",
    upstream_reference: CODEX_TOOL_SEARCH_REFERENCE,
    enabled_tool_count: corpus.length,
    expected_tool_count: expectedTools.length,
    case_count: caseCount,
    missing_expected_tools: missingExpectedTools,
    metrics: {
      top_1_accuracy: roundMetric(top1 / caseCount),
      top_3_recall: roundMetric(top3 / caseCount),
      top_8_recall: roundMetric(top8 / caseCount),
      mean_reciprocal_rank: roundMetric(reciprocalRankTotal / caseCount),
    },
    collision_pairs: collisionPairs,
    top_8_misses: top8Misses,
  };
}

export function assertToolDiscoveryEvalIntegrity(
  report: ToolDiscoveryEvalReport
): void {
  const failures: string[] = [];

  if (report.enabled_tool_count !== 54) {
    failures.push(
      `enabled_tool_count=${report.enabled_tool_count}; expected 54`
    );
  }
  if (report.case_count < 100 || report.case_count > 150) {
    failures.push(`case_count=${report.case_count}; expected 100..150`);
  }
  if (report.expected_tool_count !== 38) {
    failures.push(
      `expected_tool_count=${report.expected_tool_count}; expected 38`
    );
  }
  if (report.missing_expected_tools.length > 0) {
    failures.push(
      `missing expected tools: ${report.missing_expected_tools.join(", ")}`
    );
  }

  const metricEntries = Object.entries(report.metrics) as Array<
    [keyof ToolDiscoveryEvalReport["metrics"], number]
  >;
  for (const [name, value] of metricEntries) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      failures.push(`${name}=${value}; expected a finite value in 0..1`);
    }
  }
  if (report.metrics.top_1_accuracy > report.metrics.top_3_recall) {
    failures.push("top_1_accuracy must not exceed top_3_recall");
  }
  if (report.metrics.top_3_recall > report.metrics.top_8_recall) {
    failures.push("top_3_recall must not exceed top_8_recall");
  }

  if (failures.length > 0) {
    throw new Error(
      `Tool discovery eval integrity failure:\n- ${failures.join("\n- ")}`
    );
  }
}

if (import.meta.main) {
  const report = evaluateToolDiscovery();
  assertToolDiscoveryEvalIntegrity(report);
  console.log(JSON.stringify(report, null, 2));
}