# LazyDesigner Terminology Contract

This document defines one canonical meaning for the core architecture terms. New source and documentation should use these meanings consistently.

## Canonical terms

### Stage

Semantic authoring responsibility:

```text
GEOMETRY
TEXTURING
ANIMATION
```

Stage answers: **what authoring work owns the current task?**

Canonical source:
`mcp/lib/capabilities/authoringStage.ts`

Do not use `phase` for new internal semantics. Existing names such as `target_phase`, `authoring_phase`, `switch_authoring_phase`, phase-affinity headers/settings, and compatibility identifiers remain unchanged until their external contracts are intentionally migrated.

### Runtime Surface

The callable Runtime tool set currently loaded/exposed:

```text
AUTHORING
ANIMATION
```

Surface answers: **which Runtime capability set is available?**

Geometry and Texturing are different Stages on the same AUTHORING Runtime Surface. Animation uses the ANIMATION Runtime Surface.

### Registration Profile

Compatibility/exposure mode used when registering Runtime families:

```text
bedrock_entity
extended
```

Profile answers: **which registration families are allowed to exist?**

Profile is not a quality level, Stage, modelling strategy, or user-facing preset.

Canonical source:
`mcp/lib/capabilities/registrationProfile.ts`

### Capability

A named semantic operation discoverable/invokable through the Gateway/Runtime contract, for example `manage_cubes` or `manage_animation_controller`.

Capability answers: **what operation can the AI request?**

Canonical metadata:
`mcp/lib/capabilities/manifest.ts`

### Tool

The MCP/Runtime implementation object that validates and executes a capability.

Tool answers: **how is the capability registered and executed?**

Do not use Tool and Capability interchangeably in architecture prose:
- Capability = semantic operation / contract identity.
- Tool = MCP implementation/registration mechanism.

### Gateway

The stable AI-client-facing MCP boundary. It owns connection persistence, capability discovery/projection, Runtime recovery, affinity, and Control integration.

Gateway does not own Blockbench authored state or authoring intelligence.

### Runtime

The Blockbench-side execution boundary. It owns capability registration, validation, native execution, Runtime Surface exposure, and Blockbench-facing mutation.

Runtime does not mean the entire LazyDesigner product.

### Control

Gateway-owned context/readiness/routing projection for the current task. Control does not execute Blockbench mutations and does not own capability schemas.

### Family

A Runtime registration grouping such as `animation`, `textures`, or `elements`. Family is implementation/registration organization, not Stage.

## Compatibility vocabulary

These names intentionally remain because they are serialized, protocol-bound, persisted, or externally referenced:

```text
switch_authoring_phase
target_phase
authoring_phase
mcp_authoring_phase
phaseAffinity
x-blockit-authoring-phase
blockit-* identifiers
BLOCKIT_* environment variables
```

Compatibility names do not redefine the canonical architecture vocabulary.

## Naming rule

For new internal source and docs:

```text
semantic responsibility → Stage
callable tool set        → Runtime Surface
registration mode        → Registration Profile
semantic operation       → Capability
MCP executor object      → Tool
AI-client boundary       → Gateway
Blockbench execution     → Runtime
context routing          → Control
registration grouping    → Family
```

One concept should have one canonical name. Add an alias only when compatibility requires it, and label that alias explicitly.
