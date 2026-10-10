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

### Bounded developer path

```text
Known source/capability → sourceOwners.ts (exact source + anchor_test)
                       → impact.ts / semanticDependencies.ts when changed
                       → affectedExecution.ts (minimum relevant checks)
                       → implement and verify matching source
Unknown owner          → existing intent/context navigation, then resolve owner
```

For a known owner, skip document-graph traversal and unrelated Skills.
`affectedExecution.ts` is a **verification plan**, not evidence that tests
actually ran. Source-owner maps live only under this directory; Control
compatibility exports must not be edited as implementation authority.

This domain is **engineering intelligence**, not authoring workflow state. Product Control may consume/project its results but does not own these rules.

Development intelligence may read canonical capability/source ownership. Product semantic dependency/freshness truth is owned by `../capabilities/`; development adds only repository-impact, invalidation and verification planning. It must not become a second Runtime state database, authoring router, or capability manifest.
