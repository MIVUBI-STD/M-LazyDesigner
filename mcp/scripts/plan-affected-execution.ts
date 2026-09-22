import { analyzeSemanticImpact } from "../gateway/development/impact";
import { planAffectedExecution } from "../gateway/development/affectedExecution";
import { CAPABILITY_BRANCH_MANIFEST } from "../gateway/capabilities/manifest";
import { listExplicitSourceOwners } from "../gateway/control/sourceOwners";

export function buildAffectedExecutionPlan(changedPaths: readonly string[]) {
  const semanticImpact = analyzeSemanticImpact({
    changedPaths,
    sourceOwners: listExplicitSourceOwners(),
    manifest: CAPABILITY_BRANCH_MANIFEST,
  });
  return {
    semantic_impact: semanticImpact,
    execution: planAffectedExecution({
      changedPaths,
      semanticImpact,
    }),
  };
}

async function main() {
  const changedPaths = process.argv.slice(2).filter(Boolean);
  const plan = buildAffectedExecutionPlan(changedPaths);
  console.log(JSON.stringify(plan, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
