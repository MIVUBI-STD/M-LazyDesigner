import { analyzeSemanticImpact } from "../gateway/development/impact";
import { planAffectedExecution } from "../gateway/development/affectedExecution";
import { CAPABILITY_BRANCH_MANIFEST } from "../gateway/capabilities/manifest";
import { listExplicitSourceOwners } from "../gateway/control/sourceOwners";
import {
  CAPABILITY_SEMANTIC_REGISTRY,
  diffCapabilitySemanticRegistry,
  type CapabilitySemanticRecord,
} from "../gateway/capabilities/semanticRegistry";
import { planSemanticInvalidation } from "../gateway/development/semanticInvalidation";
import { readFile } from "node:fs/promises";

export function buildAffectedExecutionPlan(
  changedPaths: readonly string[],
  previousSemanticRegistry?: readonly CapabilitySemanticRecord[]
) {
  const semanticImpact = analyzeSemanticImpact({
    changedPaths,
    sourceOwners: listExplicitSourceOwners(),
    manifest: CAPABILITY_BRANCH_MANIFEST,
  });
  const semanticDiff = previousSemanticRegistry
    ? diffCapabilitySemanticRegistry(
        previousSemanticRegistry,
        CAPABILITY_SEMANTIC_REGISTRY
      )
    : [];
  const semanticInvalidation = previousSemanticRegistry
    ? planSemanticInvalidation(semanticDiff)
    : undefined;

  return {
    semantic_impact: semanticImpact,
    ...(semanticInvalidation
      ? {
          semantic_diff: semanticDiff,
          semantic_invalidation: semanticInvalidation,
        }
      : {}),
    execution: planAffectedExecution({
      changedPaths,
      semanticImpact,
      ...(semanticInvalidation ? { semanticInvalidation } : {}),
    }),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const semanticSnapshotFlag = args.indexOf("--previous-semantic-snapshot");
  let previousSemanticRegistry: CapabilitySemanticRecord[] | undefined;

  if (semanticSnapshotFlag >= 0) {
    const path = args[semanticSnapshotFlag + 1];
    if (!path) {
      throw new Error("--previous-semantic-snapshot requires a JSON file path.");
    }
    previousSemanticRegistry = JSON.parse(
      await readFile(path, "utf8")
    ) as CapabilitySemanticRecord[];
    args.splice(semanticSnapshotFlag, 2);
  }

  const changedPaths = args.filter(Boolean);
  const plan = buildAffectedExecutionPlan(
    changedPaths,
    previousSemanticRegistry
  );
  console.log(JSON.stringify(plan, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
