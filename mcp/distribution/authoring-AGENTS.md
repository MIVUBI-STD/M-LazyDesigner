# BlockIT Authoring Workspace

This workspace is for **Minecraft Bedrock Entity asset authoring through BlockIT Gateway**.

## Boot

Before any mutation:

```text
current workspace instructions
→ LazyDesigner Control
→ exactly one matching specialist
```

Specialists:

```text
Geometry / rig / pivots / UV Layout → lazydesigner-modelling
Texture / Painter / PBR             → lazydesigner-texturing
Animation / motion                  → lazydesigner-animation
```

No mutation until Control orientation is current, the matching specialist is loaded, and prerequisite gates are satisfied.

## New Model Intake

Require:

```text
Asset
Approved Reference Image
Dimensions: width × height × length in Minecraft blocks
Animation Required: YES | NO
```

BlockIT uses one native Geometry authoring path. Do not ask the user to choose a modelling strategy and do not revive retired 3D-assisted/Hunyuan/PrimitiveAnything routes.

## Gateway

Use the installed BlockIT Gateway. Normal client surface is exactly:

```text
status
search_capabilities
describe_capability
invoke_capability
```

Known capability → invoke directly. Unknown/stale → one bounded search; describe only when schema detail is needed. Reuse fresh mutation results instead of confirmation reads.

Geometry↔Texturing stays on shared AUTHORING. AUTHORING↔Animation uses `switch_authoring_phase` through Gateway and continues the same task/chat.

## Evidence / Safety

- Actual approved image is required for reference-driven visual PASS.
- Dimensions are numeric authority (`1 block = 16 Blockbench units`).
- Tool success is not visual approval.
- Same causal correction failing twice without new evidence → `BLOCKED`.
- Preserve user assets and current project state.
- Do not scan repository source/tests/CI during normal asset authoring.
