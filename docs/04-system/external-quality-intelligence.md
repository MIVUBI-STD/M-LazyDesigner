# LazyDesigner External Quality Intelligence Contract

External sources may improve authoring decisions only when they add evidence that the current approved reference, Bedrock specification, or native runtime does not already provide. This is a knowledge contract, not a second workflow, router, score system, or automatic style authority.

## Authority order

```text
explicit current user requirement
→ approved/current visual reference
→ persisted approved asset state
→ official Bedrock specification / native runtime evidence
→ bounded external quality intelligence
→ unresolved remains UNKNOWN
```

External knowledge never overrides an explicit user art direction, approved reference, target dimensions, native Blockbench state, or Bedrock schema/runtime truth.

## Canonical source classes

### Mojang Bedrock samples

Primary source:

```text
https://github.com/Mojang/bedrock-samples
```

Use only as advisory pattern evidence for real Bedrock composition such as animation/controller structure, Molang wiring, render/controller relationships, locator/effect usage, and entity organization.

Rules:
- do not clone Vanilla geometry or textures into a user asset;
- do not turn one Vanilla entity into a profile-wide preset;
- retrieve the smallest relevant pattern;
- preserve source file/path provenance;
- use the pattern to answer a concrete authoring question, not as general context padding.

Verified examples include player animation-controller state composition and Allay client-entity animation/controller wiring. These examples demonstrate supported Bedrock patterns; they do not define required style or motion for unrelated assets.

### Microsoft Minecraft Creator schemas/documentation

Primary sources:

```text
https://learn.microsoft.com/en-us/minecraft/creator/reference/content/schemasreference/
https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationsoverview
```

Use as normative format/semantic evidence. Track geometry, animation, texture-set, controller, Molang, and related schema/version changes that can affect export correctness.

Rules:
- specification evidence outranks community advice;
- source snapshots/diffs may create regression work, but never silently rewrite authored content;
- a schema change is not native-runtime proof until the affected path is exercised where required.

### Blockbench Minecraft Style Guide

Primary source:

```text
https://blockbench.net/wiki/guides/minecraft-style-guide/
```

Use only when Minecraft-native/Vanilla-compatible visual language is a requirement. Core evidence:
- recognizable overall form belongs primarily to model geometry;
- most surface detail belongs to texture;
- element count should be no higher than required for recognizability;
- pixel/model scale should remain coherent unless an explicit art direction says otherwise.

This guidance produces categorical review evidence, never an aggregate style score.

### Blockbench source/issues

Primary source:

```text
https://github.com/JannisX11/blockbench
```

Use confirmed, relevant editor/export quirks only to build deterministic regression cases. Historical issue text is not a permanent product rule.

A quirk enters LazyDesigner regression coverage only when:
1. the affected behavior is relevant to Bedrock authoring;
2. the behavior is reproducible or represented by a deterministic source/native test;
3. the expected semantic result is known;
4. the regression does not merely encode an obsolete Blockbench bug.

Candidate classes include identity/case handling, mirror pairing, pivots, UV orientation, interpolation/export, save/reopen identity, and codec round-trips.

## Quality integrations

### Cross-view reference consistency

Canonical executable owner:

```text
mcp/lib/referenceCrossViewEvidence.ts
```

Compare only semantic/world-space constraints that multiple views explicitly claim about the same part. Never infer numeric scale from image pixels and never treat occlusion as absence.

Conflict classes:

```text
dimension_conflict
attachment_conflict
```

A material conflict stays `CONFLICTING` and blocks dependent construction until resolved. Do not average materially conflicting views.

### Minecraft-native representation evidence

Canonical executable owner:

```text
mcp/lib/minecraftStyleEvidence.ts
```

Evidence classes:

```text
surface_detail_overmodeled
silhouette_under_modeled
motion_misowned
pixel_scale_conflict
```

This evidence is conditional on a Minecraft-native style requirement. Explicit non-Vanilla/MIVUBI art direction may intentionally depart from it.

### Animation contact integrity

Canonical executable owner:

```text
mcp/lib/animationContactEvidence.ts
```

Contact evidence requires caller-supplied sampled world positions from real editor/runtime state. Supported constraint semantics:

```text
pair     marker follows another moving target
fixed    marker approaches/remains near a fixed target
planted  marker remains planted while the phase requires contact
```

Distance/contact PASS is geometric evidence only. It does not prove weight transfer, deformation, timing, or visual quality. Native reference-grounded playback remains required.

## Vanilla pattern intelligence

Vanilla examples are retrieved only for a named unresolved semantic question, for example:

```text
How does Bedrock represent state transition/blending?
How are several animations/controllers wired into a client entity?
What native composition exists for held-item or look-at behavior?
```

Return only the relevant pattern, source identity, and applicability boundary. Never return a preferred asset, style ranking, or automatic geometry plan.

## Bedrock specification tracking

Remote GitHub work may maintain source snapshots, schema inventories, provenance hashes, and regression fixtures. A spec update may produce:

```text
NEW_FIELD
CHANGED_SEMANTICS
DEPRECATED_FIELD
REMOVED_FIELD
VERSION_ADDED
```

but only a verified affected code path may be changed. Generated docs are regenerated from canonical source; do not hand-edit generated API artifacts.

## Native quirk regression corpus

Remote tests may encode deterministic parser/serializer/semantic regressions. Tests that depend on actual Blockbench editor behavior must remain explicitly `source contract / not live proof` until LOCAL_CODE or LIVE_BLOCKBENCH executes them.

Prefer:

```text
author semantic state
→ serialize/save/export
→ parse/reopen
→ compare semantic state
```

over screenshot-only or implementation-detail assertions when a round-trip can express the real requirement.

## Anti-overdevelopment rules

Do not add:
- a second Director/workflow engine;
- a separate approval system;
- an automatic Vanilla style selector;
- a scalar quality score;
- an always-loaded external knowledge corpus;
- network lookup in the normal authoring hot path;
- auto-mutation from external examples.

External quality intelligence is successful only when it improves a concrete decision while preserving the existing Control → Gateway → Runtime → Plugin ownership chain.


## Current External / Fork Closure

Current remote comparison against the experimental `Ref` research branch and `A-MIVUBI-Blockbench/chatgpt-dev` uses this decision boundary:

| External idea | LazyDesigner decision | Reason |
| --- | --- | --- |
| second Director / route system / model-spec compiler | REJECTED | duplicates Control → Gateway → Runtime and increases correction/state cost |
| quality decision router / separate approval engine | REJECTED | existing evidence + readiness owners already separate diagnostics from approval |
| persistent approved-asset / quality-profile registry | REJECTED | would create a second durable authority; approved reference/current workspace already own task truth |
| always-loaded normalized knowledge corpus / `bb_knowledge` equivalent | REJECTED | bounded external retrieval is preferred; no hot-path corpus/database |
| cross-view reference comparator | IMPLEMENTED | `mcp/lib/referenceCrossViewEvidence.ts` |
| Minecraft-native representation/style evidence | IMPLEMENTED | `mcp/lib/minecraftStyleEvidence.ts` |
| animation/contact geometric evidence | IMPLEMENTED | `mcp/lib/animationContactEvidence.ts` plus native playback boundary |
| surface / physical UV / motion-craft diagnostics | IMPLEMENTED | existing Runtime evidence augmentation; no new public tools |
| synthetic benchmark ≠ measured baseline | IMPLEMENTED | existing six-case benchmark explicitly remains synthetic and categorical |
| fixed cuboid/bone/keyframe targets or aggregate quality score | REJECTED | complexity must be causal; quality remains vector/categorical |
| risk-derived minimum review views | ALREADY COVERED | Difference-First / Minimum Necessary Evidence rules already select evidence by diagnosed risk |
| geometry boundary caused by form/articulation/attachment/state rather than color alone | ALREADY COVERED | current representation and Minecraft-style evidence already enforce geometry-vs-texture ownership |
| uncertainty / identity-critical task metadata | DEFERRED | static research is promising but native accepted-result benefit is not yet proven |
| responsibility vocabulary `FORM | ARTICULATION | ATTACHMENT | STATE | FOLLOW | CONTROL` | DEFERRED | statically validated on `Ref`; do not promote to schema/workflow without native cost-to-accepted-result proof |
| automated upstream capability/source snapshot ingestion | DEFERRED | useful only when a concrete version-sensitive regression justifies maintenance cost |
| offline Bedrock conformance certification pipeline | DEFERRED | current export-integrity/native-acceptance owners cover authoring safety; release certification needs separate concrete product requirement |
| graphics/display/runtime fixture matrix | DEFERRED | use only for a named runtime-sensitive feature under LOCAL_CODE/LIVE_BLOCKBENCH, never as default authoring burden |

Closure rule: a deferred item is not a TODO by default. It becomes active only when a concrete LazyDesigner task exposes the missing evidence or when native testing demonstrates lower Cost to Accepted Result without adding duplicate ownership.
