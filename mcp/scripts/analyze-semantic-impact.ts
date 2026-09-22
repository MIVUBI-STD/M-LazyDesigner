import { analyzeSemanticImpact } from "../gateway/development/impact";
import { CAPABILITY_BRANCH_MANIFEST } from "../gateway/capabilities/manifest";
import { listExplicitSourceOwners } from "../gateway/control/sourceOwners";

async function main() {
  const changedPaths = process.argv.slice(2).filter(Boolean);
  if (changedPaths.length === 0) {
    throw new Error(
      'Usage: bun run analyze:semantic-impact -- "<changed path>" ["<changed path>" ...]'
    );
  }

  const report = analyzeSemanticImpact({
    changedPaths,
    sourceOwners: listExplicitSourceOwners(),
    manifest: CAPABILITY_BRANCH_MANIFEST,
  });
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
