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
→ exact Blockbench version AND active plugin bundle build identity match a
  recorded successful native acceptance entry. Version-only evidence is insufficient

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

The source type baseline remains Blockbench types 5.1.0. Historical repository
records mention native tests on Blockbench 5.2.0, but they are not validation
for the current plugin build. `liveValidatedBuilds` starts empty: 5.2.0,
5.2.1 and 5.2.2 are allowed with `compatible-unverified`, not `validated`.
The native plugin supplies its embedded `sha256:<bundle>` identity; Desktop
version-only discovery cannot claim current-build native proof.

When Blockbench publishes a new feature release:

```text
release/beta appears
→ inspect Blockbench technical/API changes
→ run existing LazyDesigner source gate
→ run bounded LIVE_BLOCKBENCH compatibility harness
→ add {version, buildIdentity} to liveValidatedBuilds only after matching
  exact-bundle and live-editor acceptance evidence is recorded with source SHA
→ move reviewBoundaryVersion only after the new family is reviewed
```

Do not fork Runtime implementations per Blockbench version unless a real incompatible API boundary requires a small adapter. Prefer feature/version probes at the narrowest owner over parallel Runtime trees.
