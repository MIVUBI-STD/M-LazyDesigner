import type { SemanticImpactReport } from "./impact";
import type { SemanticInvalidationPlan } from "./semanticInvalidation";
import { semanticInvalidationCommands } from "./semanticInvalidation";
import {
  planAuthoringDomainInvalidation,
  type AuthoringDomain,
} from "./domainInvalidation";

export type AffectedExecutionCheck =
  | "TYPECHECK_RUNTIME"
  | "TYPECHECK_GATEWAY"
  | "PROJECT_GRAPH"
  | "AUDIT_UNUSED_RUNTIME"
  | "AUDIT_UNUSED_GATEWAY"
  | "DOCS_FRESHNESS"
  | "REPOSITORY_CONTRACTS"
  | "AUTHORING_CONTRACTS"
  | "TARGETED_TESTS"
  | "CAPABILITY_MANIFEST"
  | "CAPABILITY_INTELLIGENCE"
  | "DECISION_EFFICIENCY"
  | "DESCRIBE_PAYLOADS"
  | "FULL_VERIFY";

export type AffectedExecutionPlan = {
  changed_paths: string[];
  checks: AffectedExecutionCheck[];
  targeted_tests: string[];
  authoring_domains: AuthoringDomain[];
  commands: string[];
  fallback_full_verify: boolean;
  reasons: string[];
};

function normalize(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function isProjectGraphTypeScript(path: string): boolean {
  return (
    path.endsWith(".ts") &&
    (
      path.startsWith("mcp/gateway/") ||
      path.startsWith("mcp/server/") ||
      path.startsWith("mcp/lib/")
    )
  );
}

function isRuntimeTypeScriptOutsideProjectGraph(path: string): boolean {
  return (
    path.startsWith("mcp/") &&
    path.endsWith(".ts") &&
    !isProjectGraphTypeScript(path)
  );
}

const GATEWAY_SHARED_PROJECT_FILES = new Set([
  "mcp/lib/runtimeFetch.ts",
  "mcp/lib/runtimeConnection.ts",
  "mcp/lib/capabilityMetadata.ts",
  "mcp/lib/capabilities/manifest.ts",
  "mcp/lib/authoringPhase.ts",
  "mcp/lib/registrationProfile.ts",
]);

function affectsProjectGraph(path: string): boolean {
  return isProjectGraphTypeScript(path) || GATEWAY_SHARED_PROJECT_FILES.has(path);
}

function affectsDocs(path: string): boolean {
  return (
    path.startsWith("mcp/server/tools/") ||
    path.startsWith("mcp/server/resources/") ||
    path.startsWith("mcp/server/runtime/") ||
    path.startsWith("mcp/build/") ||
    path.startsWith("mcp/prompts/") ||
    path === "mcp/lib/factories.ts"
  );
}

function affectsRepositoryContracts(path: string): boolean {
  return (
    path.startsWith(".github/") ||
    path === "AGENTS.md" ||
    path === "GITHUB_RULES.md" ||
    path.startsWith("docs/04-system/") ||
    path.startsWith("docs/05-operations/") ||
    path.startsWith("mcp/tests/repository/") ||
    path.startsWith("mcp/gateway/control/")
  );
}

function affectsAuthoringContracts(path: string): boolean {
  return (
    path.startsWith(".agents/skills/lazydesigner-") ||
    path.startsWith("docs/03-authoring/") ||
    path.startsWith("mcp/server/tools/") ||
    path.startsWith("mcp/server/runtime/") ||
    path.startsWith("mcp/gateway/control/") ||
    path.startsWith("mcp/tests/authoring/")
  );
}

function requiresFullVerify(path: string): boolean {
  return (
    path === "mcp/package.json" ||
    path === "mcp/bun.lock" ||
    path === "mcp/tsconfig.json" ||
    path === "mcp/gateway/tsconfig.json" ||
    path === ".bun-version"
  );
}

function clearlyMappedPath(path: string): boolean {
  return (
    path.startsWith("mcp/") ||
    path.startsWith(".agents/") ||
    path.startsWith("docs/") ||
    path.startsWith(".github/") ||
    path === "AGENTS.md" ||
    path === "GITHUB_RULES.md" ||
    path === "CONTEXT.md"
  );
}

export function planAffectedExecution(input: {
  changedPaths: readonly string[];
  semanticImpact: SemanticImpactReport;
  semanticInvalidation?: SemanticInvalidationPlan;
}): AffectedExecutionPlan {
  const changedPaths = uniqueSorted(input.changedPaths.map(normalize));
  const checks = new Set<AffectedExecutionCheck>();
  const reasons: string[] = [];
  const domainInvalidation = planAuthoringDomainInvalidation({
    changedPaths,
    affectedCapabilities: input.semanticImpact.affected_capabilities.map(
      (entry) => entry.capability
    ),
    affectedSources: input.semanticImpact.affected_sources,
    affectedSpecialists: input.semanticImpact.affected_specialists,
  });

  if (
    input.semanticImpact.truncated ||
    changedPaths.length === 0 ||
    changedPaths.some(requiresFullVerify) ||
    changedPaths.some((path) => !clearlyMappedPath(path))
  ) {
    checks.add("FULL_VERIFY");
    reasons.push(
      input.semanticImpact.truncated
        ? "semantic impact was truncated"
        : changedPaths.length === 0
          ? "no change set was provided"
          : changedPaths.some(requiresFullVerify)
            ? "change set contains build or dependency infrastructure"
            : "change set contains an unmapped path"
    );
  }

  if (changedPaths.some(affectsProjectGraph)) {
    checks.add("PROJECT_GRAPH");
  }
  if (changedPaths.some(isRuntimeTypeScriptOutsideProjectGraph)) {
    checks.add("TYPECHECK_RUNTIME");
    checks.add("AUDIT_UNUSED_RUNTIME");
  }
  if (changedPaths.some(affectsDocs)) checks.add("DOCS_FRESHNESS");
  if (changedPaths.some(affectsRepositoryContracts)) {
    checks.add("REPOSITORY_CONTRACTS");
  }
  if (changedPaths.some(affectsAuthoringContracts)) {
    checks.add("AUTHORING_CONTRACTS");
  }

  if (input.semanticInvalidation?.full_catalog_invalidation) {
    checks.add("FULL_VERIFY");
    reasons.push("semantic capability identity set changed");
  } else if (input.semanticInvalidation) {
    for (const check of input.semanticInvalidation.checks) {
      checks.add(check);
    }
  }

  const targetedTests = uniqueSorted(
    input.semanticImpact.affected_tests.filter((path) =>
      path.startsWith("mcp/tests/") && path.endsWith(".test.ts")
    )
  );
  if (targetedTests.length > 0) checks.add("TARGETED_TESTS");

  if (checks.size === 0) {
    checks.add("FULL_VERIFY");
    reasons.push("mapped change produced no safe bounded verification owner");
  }

  const commands: string[] = [];
  if (checks.has("FULL_VERIFY")) {
    commands.push("bun run verify:full");
  } else {
    if (checks.has("DOCS_FRESHNESS")) commands.push("bun run docs:check");
    if (checks.has("PROJECT_GRAPH")) {
      commands.push("bun run verify:project-graph");
    }
    if (checks.has("TYPECHECK_RUNTIME")) commands.push("bun run typecheck");
    if (checks.has("TYPECHECK_GATEWAY")) commands.push("bun run typecheck:gateway");
    if (checks.has("AUDIT_UNUSED_RUNTIME")) commands.push("bun run audit:unused");
    if (checks.has("AUDIT_UNUSED_GATEWAY")) {
      commands.push("bun run audit:unused:gateway");
    }
    if (checks.has("TARGETED_TESTS")) {
      commands.push(
        `bun test ${targetedTests.map((path) =>
          path.startsWith("mcp/") ? path.slice(4) : path
        ).join(" ")}`
      );
    }
    if (checks.has("AUTHORING_CONTRACTS")) {
      commands.push("bun run verify:authoring");
    }
    if (checks.has("REPOSITORY_CONTRACTS")) {
      commands.push("bun run verify:repository");
    }
    if (input.semanticInvalidation) {
      commands.push(...semanticInvalidationCommands(input.semanticInvalidation));
    }
  }

  return {
    changed_paths: changedPaths,
    checks: [...checks].sort(),
    targeted_tests: targetedTests,
    authoring_domains: domainInvalidation.domains,
    commands: uniqueSorted(commands),
    fallback_full_verify: checks.has("FULL_VERIFY"),
    reasons,
  };
}
