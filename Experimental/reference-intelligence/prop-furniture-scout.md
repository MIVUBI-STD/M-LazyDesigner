# Prop / Furniture Reference Intelligence Scout

Status: `OBSERVATION` / source-selection pass only. Not production authority.

## Purpose

Daffa's Arsenal and Mowzie's Mobs provide strong evidence for complex mechanical, creature, and humanoid authoring. This scout deliberately searches the opposite end of the complexity spectrum: simple props, furniture, environmental objects, and small articulated props.

The goal is to teach LazyDesigner when **not** to add hierarchy, helpers, cubes, or animation structure.

## Primary Candidate Source — Blockbench Workshop

Blockbench Workshop is useful as a discovery surface because listings expose real downloadable `.bbmodel` projects, previewable models, author metadata, simple structural counts, and per-listing usage/license information.

This source is not one global craftsmanship authority. Each model must be evaluated independently.

### Rights rule

Only use listings whose rights/terms are explicit enough for the intended research action. Prefer CC0 / CC BY / similarly clear permissions. Even when redistribution is allowed, do not import third-party asset payloads into LazyDesigner unless a concrete test requires it. Derived measurements and generic principles are preferred.

## Candidate A — Old Shelf / @polyjo

Source:
https://blockbenchworkshop.com/model/polyjo/old-shelf

Observed listing facts:

- CC BY 4.0;
- generic Blockbench model;
- Minecraft/furniture/prop/rustic tags;
- 3 elements;
- 1 bone;
- 0 animations;
- 1 texture;
- 64×64 texture.

### Why it matters

This is useful precisely because it is small.

A static shelf does not gain authoring quality from helper-bone density or deep hierarchy. If the silhouette, proportions, surface identity, editability, and required placement behavior are already represented, one semantic owner can be sufficient.

Candidate principle:

> Static visual subparts that do not need independent transform, state, attachment, deformation, or authoring ownership do not require separate bones merely because they are visibly distinct.

## Candidate B — Old Workbench / @polyjo

Source:
https://blockbenchworkshop.com/model/polyjo/old-workbench

Observed listing facts:

- CC BY 4.0;
- generic Blockbench model;
- furniture/Minecraft/workbench/bench/prop/rustic tags;
- 7 elements;
- 1 bone;
- 0 animations;
- 1 texture.

### Why it matters

Compared with complex corpora, the workbench reinforces that several geometric elements can remain under one transform owner when they form one static object.

Candidate principle:

> Element decomposition and bone decomposition are different decisions.

Several cubes/elements may be needed to describe form while only one transform owner is needed.

This is a useful guard against the false rule:

```text
visible piece
→ new bone
```

## Candidate C — Toolbox / @9greenworks

Source:
https://blockbenchworkshop.com/model/9greenworks/toolbox

Observed listing facts:

- CC BY 4.0;
- creator states original work;
- generic Blockbench model;
- 3 elements;
- 2 bones;
- 2 animations;
- 1 texture;
- described as a toolbox with openable top.

### Why it matters

This is a compact articulated prop.

The key contrast is:

```text
static shell/body
+
moving lid
=
small hierarchy justified by actual articulation
```

The model therefore provides a clean cross-domain example of transform-responsibility decomposition without the noise of a large weapon or creature rig.

Candidate principle:

> Add a distinct articulated owner when a subpart must perform a materially independent transform; keep the rest of the static prop structurally minimal.

It also suggests a useful validation question for simple props:

```text
Does the moving part have the smallest hierarchy sufficient for the requested motion?
```

## Candidate D — Rustic Furniture Family / @polyjo

Related public listings include Old Chair, Old Table, Old Easel, Old Shelf, and Old Workbench.

This family is potentially more useful than one isolated asset because it can reveal whether a consistent style language is achieved mainly through:

- proportion;
- repeated shape vocabulary;
- texture/palette treatment;
- detail budgeting;
- silhouette family resemblance;

rather than increasing rig complexity.

Status: `FAMILY_STUDY_CANDIDATE`.

Do not infer structural details for listings not yet inspected directly.

## Candidate E — Stylized Furniture Outside Minecraft

Blockbench Workshop also exposes stylized furniture such as Thunder Table / Thunder Sofa / Thunder Bed and Chinese Armchair.

These may become style-language references, but they are not yet accepted as Minecraft craftsmanship evidence. Their value would be comparative: how a small number of forms communicates furniture identity and style.

Status: `DEFERRED_STYLE_COMPARISON`.

## Cross-Corpus Contrast

| Question | Daffa / Mowzie evidence | Simple prop evidence | Candidate conclusion |
| --- | --- | --- | --- |
| Should every visible part be a bone? | many functional/non-visual bones exist | shelf/workbench remain one-bone despite multiple elements | no; bone ownership is functional |
| Is hierarchy depth a quality signal? | deep chains can be justified | static furniture can be flat | no |
| Does geometry count define quality? | complex assets may need many elements | useful props can use 3–7 | no |
| When is another bone justified? | articulation/state/attachment/deformation | toolbox lid needs independent movement | when responsibility differs |
| Can several cubes share one owner? | yes | strongly demonstrated | yes |
| Should static props receive speculative animation-ready helpers? | not necessarily | simple corpus argues against it | default no without requirement |

## New Candidate Pattern — Minimum Sufficient Structure

Status: `CANDIDATE_RULE`.

```text
authoring requirement
→ identify semantic responsibilities
→ allocate the fewest owners that preserve:
   - required form
   - independent motion
   - state
   - attachment
   - deformation
   - correction/editability
→ stop
```

This is not a cube-count minimization rule.

A complex form may still require many elements. The constraint is specifically on **unnecessary ownership/hierarchy**, not visual detail required by the reference.

## New Candidate Pattern — Element vs Owner Separation

Status: `CANDIDATE_RULE`.

```text
ELEMENT
= geometry needed to describe shape

OWNER/BONE
= transform / articulation / state / attachment / deformation responsibility
```

Do not create one owner per element by default.

This distinction is especially valuable for furniture and environment props, where shape construction often uses several cuboids but the object remains one static semantic assembly.

## Simple-Prop Pre-Authoring Questions

For a prop/furniture request, the smallest useful reasoning pass may be:

1. What silhouette masses are required?
2. Which details require geometry vs texture?
3. Is anything expected to move, open, rotate, slide, detach, or change state?
4. Are there attachment/interaction anchors required?
5. If no, can the entire asset remain under one semantic owner?
6. If yes, what is the smallest independent articulated structure needed?
7. Which views actually prove proportions, depth, and moving-part clearance?

This should remain internal reasoning, not a mandatory verbose artifact.

## Current Decision

The Blockbench Workshop simple-prop set is accepted as a **candidate scouting corpus**, not yet a canonical craftsmanship authority.

Most valuable immediate lesson:

> LazyDesigner intelligence must learn both when complexity is necessary and when simplicity is the higher-quality structural decision.

Next research should inspect a small licensed furniture family and one or two animated props deeply enough to compare actual `.bbmodel` organization, texture allocation, pivot placement, and style consistency.