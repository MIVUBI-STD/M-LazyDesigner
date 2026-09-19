# Blockbench Compatibility Boundary

LazyDesigner treats Blockbench compatibility as an explicit product boundary rather than an implicit property of whichever Blockbench build happens to be installed.

## Canonical owner

```text
mcp/compatibility/blockbench.json
→ machine-readable compatibility policy

mcp/lib/blockbenchCompatibility.ts
→ deterministic policy evaluation

mcp/index.ts
→ plugin installation minimum + startup diagnostic gate
```

The compatibility manifest is intentionally small. It is the future shared input for the planned LazyDesigner Desktop control plane; do not create a second version table in the Desktop app.

## Status semantics

```text
validated
→ exact version has matching recorded live LazyDesigner evidence

compatible-unverified
→ version is at or above the minimum and below the review boundary,
  but no exact live-validation claim is made

review-required
→ version is at or beyond the next compatibility review boundary;
  Runtime may start, but the user receives a warning and the version
  must not be described as validated

unsupported
→ version is below the minimum and startup is blocked

invalid
→ version text cannot be evaluated and startup is blocked
```

The review boundary is not a claim that a future Blockbench version is incompatible. It is a guard against silently treating an unreviewed feature release as proven-compatible.

## Current policy

The source type baseline remains Blockbench types 5.1.0. Current repository evidence records live native testing against Blockbench 5.2.0. Other versions must not inherit that live proof by version proximity.

When Blockbench publishes a new feature release:

```text
release/beta appears
→ inspect Blockbench technical/API changes
→ run existing LazyDesigner source gate
→ run bounded LIVE_BLOCKBENCH compatibility harness
→ add exact version to liveValidatedVersions only after matching live proof
→ move reviewBoundaryVersion only after the new family is reviewed
```

Do not fork Runtime implementations per Blockbench version unless a real incompatible API boundary requires a small adapter. Prefer feature/version probes at the narrowest owner over parallel Runtime trees.
