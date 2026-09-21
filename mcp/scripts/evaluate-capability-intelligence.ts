import "@/server/tools";
import { getEnabledToolDefinitions } from "@/lib/factories";
import { classifyMcpToolPhaseByName, type McpAuthoringPhase } from "@/lib/authoringPhase";
import { searchCapabilityCatalog } from "@/gateway/capabilities/catalog";
import type { BackendTool } from "@/gateway/protocol";
import { projectCapabilitiesForSearch, decorateCapabilities } from "@/gateway/control";
import { TOOL_DISCOVERY_CASES } from "./evaluate-tool-discovery";

type BranchCase = {
  query: string;
  expected: string;
  branch: { field: string; value: string };
  phase: McpAuthoringPhase;
};

const BRANCH_CASES: readonly BranchCase[] = [
  {
    query: "make the chair leg taller",
    expected: "manage_cubes",
    branch: { field: "operation", value: "update" },
    phase: "geometry",
  },
  {
    query: "create a new cube for the head",
    expected: "manage_cubes",
    branch: { field: "operation", value: "create" },
    phase: "geometry",
  },
  {
    query: "batch resize several cubes together",
    expected: "manage_cubes",
    branch: { field: "operation", value: "batch_update" },
    phase: "geometry",
  },
  {
    query: "pack uv islands without overlap",
    expected: "manage_uv_layout",
    branch: { field: "operation", value: "plan" },
    phase: "texturing",
  },
  {
    query: "apply the existing uv plan",
    expected: "manage_uv_layout",
    branch: { field: "operation", value: "apply" },
    phase: "texturing",
  },
  {
    query: "create a blank texture",
    expected: "create_texture",
    branch: { field: "type", value: "blank" },
    phase: "texturing",
  },
  {
    query: "create texture from model template",
    expected: "create_texture",
    branch: { field: "type", value: "template" },
    phase: "texturing",
  },
  {
    query: "make a texture variant from the source texture",
    expected: "create_texture",
    branch: { field: "type", value: "variant" },
    phase: "texturing",
  },
  {
    query: "create a new pbr material",
    expected: "manage_material",
    branch: { field: "operation", value: "create" },
    phase: "texturing",
  },
  {
    query: "configure the pbr material channels",
    expected: "manage_material",
    branch: { field: "operation", value: "configure" },
    phase: "texturing",
  },
];

function runtimeTools(): BackendTool[] {
  return Object.entries(getEnabledToolDefinitions())
    .map(([name, definition]) => ({
      name,
      title: definition.title,
      description: definition.description,
      inputSchema: definition.inputSchema,
      annotations: definition.annotations,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function routingPhase(expected: string): McpAuthoringPhase {
  const owner = classifyMcpToolPhaseByName(expected);
  return owner === "geometry" || owner === "texturing" || owner === "animation"
    ? owner
    : "geometry";
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

const tools = runtimeTools();
let top1 = 0;
let top3 = 0;
let resultChars = 0;
let resultCount = 0;
const misses: Array<{
  query: string;
  expected: string;
  actual: string[];
}> = [];

for (const testCase of TOOL_DISCOVERY_CASES) {
  const results = searchCapabilityCatalog(
    tools,
    testCase.query,
    4,
    {
      authoringPhase: routingPhase(testCase.expected),
      facts: { project_bound: true },
    }
  );
  const names = results.map((item) => item.capability_id);
  if (names[0] === testCase.expected) top1 += 1;
  if (names.slice(0, 3).includes(testCase.expected)) top3 += 1;
  if (!names.slice(0, 3).includes(testCase.expected) && misses.length < 12) {
    misses.push({
      query: testCase.query,
      expected: testCase.expected,
      actual: names,
    });
  }

  const projected = projectCapabilitiesForSearch(decorateCapabilities(results));
  resultChars += JSON.stringify(projected).length;
  resultCount += 1;
}

let branchCorrect = 0;
const branchMisses: Array<{
  query: string;
  expected: string;
  expected_branch: BranchCase["branch"];
  actual: unknown;
}> = [];

for (const testCase of BRANCH_CASES) {
  const [result] = searchCapabilityCatalog(
    tools,
    testCase.query,
    4,
    {
      authoringPhase: testCase.phase,
      facts: { project_bound: true },
    }
  );
  const correct =
    result?.capability_id === testCase.expected &&
    result.branch?.field === testCase.branch.field &&
    result.branch?.value === testCase.branch.value;
  if (correct) branchCorrect += 1;
  else {
    branchMisses.push({
      query: testCase.query,
      expected: testCase.expected,
      expected_branch: testCase.branch,
      actual: result ?? null,
    });
  }
}

const caseCount = TOOL_DISCOVERY_CASES.length;
const report = {
  proof: "actual Gateway capability retrieval path; local deterministic search, no model/API/embedding call",
  catalog_tool_count: tools.length,
  case_count: caseCount,
  branch_case_count: BRANCH_CASES.length,
  metrics: {
    top_1_accuracy: round(top1 / Math.max(caseCount, 1)),
    top_3_recall: round(top3 / Math.max(caseCount, 1)),
    branch_accuracy: round(branchCorrect / BRANCH_CASES.length),
    average_projected_search_chars: Math.round(resultChars / Math.max(resultCount, 1)),
    precondition_mode: "three_state_ready_unknown_blocked",
  },
  bounded_result_limit: 4,
  misses,
  branch_misses: branchMisses,
};

if (report.catalog_tool_count !== 54) {
  throw new Error(
    `Capability intelligence benchmark expected 54 tools, got ${report.catalog_tool_count}`
  );
}
if (report.metrics.top_3_recall < report.metrics.top_1_accuracy) {
  throw new Error("Top-3 recall cannot be lower than Top-1 accuracy.");
}
if (report.metrics.branch_accuracy < 0.8) {
  throw new Error(
    `Branch routing regression: accuracy=${report.metrics.branch_accuracy}`
  );
}
if (report.metrics.average_projected_search_chars > 1800) {
  throw new Error(
    `Capability search projection exceeded compact-output guard: ${report.metrics.average_projected_search_chars} chars`
  );
}

console.log(JSON.stringify(report, null, 2));
