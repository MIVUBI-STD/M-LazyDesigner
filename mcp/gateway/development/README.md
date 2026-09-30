# Gateway Development Intelligence

Owns repository-development diagnosis that the Gateway may project for `SYSTEM_DEVELOPMENT` tasks.

```text
intent.ts                    intent → development domain/source owners
impact.ts                    changed paths → semantic blast radius
semanticDependencies.ts      semantic dependency relationships
semanticDependencyMatrix.ts  compatibility + engineering verification/check mapping
semanticFreshness.ts         compatibility re-export of capability-owned freshness core
semanticInvalidation.ts      scoped invalidation planning
affectedExecution.ts         affected verification execution model
semanticArtifact.ts          derived-artifact identity
```

This domain is **engineering intelligence**, not authoring workflow state. Product Control may consume/project its results but does not own these rules.

Development intelligence may read canonical capability/source ownership. Product semantic dependency/freshness truth is owned by `../capabilities/`; development adds only repository-impact, invalidation and verification planning. It must not become a second Runtime state database, authoring router, or capability manifest.
