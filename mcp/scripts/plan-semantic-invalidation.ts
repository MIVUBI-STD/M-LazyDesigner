import { readFile } from "node:fs/promises";
import {
  CAPABILITY_SEMANTIC_REGISTRY,
  diffCapabilitySemanticRegistry,
  type CapabilitySemanticRecord,
} from "../gateway/capabilities/semanticRegistry";
import {
  planSemanticInvalidation,
  semanticInvalidationCommands,
} from "../gateway/development/semanticInvalidation";

async function main() {
  const beforePath = process.argv[2];
  if (!beforePath) {
    throw new Error(
      'Usage: bun run plan:semantic-invalidation -- "<previous-registry.json>"'
    );
  }

  const parsed = JSON.parse(
    await readFile(beforePath, "utf8")
  ) as CapabilitySemanticRecord[];
  if (!Array.isArray(parsed)) {
    throw new Error("Previous semantic registry snapshot must be a JSON array.");
  }

  const diffs = diffCapabilitySemanticRegistry(
    parsed,
    CAPABILITY_SEMANTIC_REGISTRY
  );
  const invalidation = planSemanticInvalidation(diffs);

  console.log(
    JSON.stringify(
      {
        diffs,
        invalidation,
        commands: semanticInvalidationCommands(invalidation),
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
