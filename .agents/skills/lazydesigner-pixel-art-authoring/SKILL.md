---
name: lazydesigner-pixel-art-authoring
description: In-use Reference Preparation specialist for deliberate integer-grid pixel art, Minecraft-native icons, object sprites, tiles/patterns, reference conversion, and pixel texture references. Do not use for Blockbench atlas/UV mutation, model Geometry, particle runtime semantics, bone animation, or product development.
---

# LazyDesigner Pixel Art Authoring

## Activation Contract

```text
LANE: IN_USE
DOMAIN: REFERENCE_PREPARATION
CLASS: SPECIALIST
OWNER: PIXEL_ART_REFERENCE
```

Enter for a standalone grid-authored pixel artifact or pixel reference dependency. Do not enter merely because a Blockbench texture should look pixel-styled; mapped atlas/UV/Painter work belongs to `lazydesigner-texturing`. Do not cross into product development because visual output needs correction.


Canonical Reference Preparation specialist for standalone pixel-art tasks.

It owns pixel-art reasoning and artifact preparation. It does **not** own Blockbench texture mutation, UV/atlas state, model geometry, Bedrock particle runtime semantics, or bone animation.

Canonical domain index:

```text
docs/02-reference/pixel-art/README.md
```

Canonical professional production contract:

```text
docs/02-reference/pixel-art/authoring-spec.md
```

## Hot Path

```text
USER REQUEST
→ normalize only material intent fields
→ classify artifact once
→ resolve target mode / Minecraft visual family when material
→ choose lowest viable grid/detail budget
→ composition + silhouette
→ value / palette-ramp structure
→ deliberate cluster construction
→ edge-topology cleanup
→ causal shading / material response
→ outline / separation logic when used
→ identity landmarks
→ simplification pass
→ applicable target-specific pass
→ QA once
→ deliver asset or compact downstream handoff
```

Artifact classes:

```text
ICON
OBJECT / PROP
SPRITE
TILE / PATTERN
TEXTURE_REFERENCE
AUDIT / REVISION
```

Target modes:

```text
GENERIC_PIXEL
MINECRAFT_NATIVE
MIVUBI_HD_PIXEL
```

Minecraft-facing visual families when relevant:

```text
ITEM ICON
BLOCK TEXTURE
ENTITY / SKIN TEXTURE
GUI / SYMBOL
PARTICLE TEXTURE
REFERENCE-ONLY PIXEL ART
```

Do not treat all Minecraft pixel assets as one identical style problem.

## True Pixel Rule

Pixel art is authored on an integer grid.

Never satisfy the request by:

```text
smooth illustration
→ blur/downscale/pixelation filter
→ nearest-neighbor upscale
→ call it finished
```

Required causal order:

```text
GRID
→ SILHOUETTE / MASSES
→ VALUE + PALETTE RELATIONSHIPS
→ PIXEL CLUSTERS
→ EDGE TOPOLOGY
→ SHADING / MATERIAL RESPONSE
→ IDENTITY
→ SIMPLIFICATION
→ QA
```

Reject accidental anti-aliasing, mixed pixel scale, uncontrolled gradients, random orphan noise, pseudo-pixel artifacts, pillow shading without form cause, and detail that does not improve identity/function/material read.

## Artist Judgment Hierarchy

When visual priorities compete:

```text
READABILITY
> FORM
> IDENTITY
> MATERIAL
> STYLE CONSISTENCY
> DETAIL
> DECORATION
```

When detail is uncertain:

```text
REMOVE DETAIL
→ CHECK AT NATIVE SCALE
→ RESTORE ONLY IF READABILITY / FORM / IDENTITY / MATERIAL READ DECREASES
```

This is the default antidote to AI-style over-decoration.

## Resolution Budget

Choose the smallest grid that preserves requested identity and use.

Planning tiers may include:

```text
MICRO      8×8 / 12×12
ICON       16×16
DETAILED   24×24 / 32×32
HD_PIXEL   48×48 / 64×64
SPECIAL    explicit target
```

These are planning aids, not universal defaults. Explicit target requirements override them.

Do not increase resolution merely to avoid hard simplification decisions.

## Professional Craft Invariants

Keep these without loading extra docs unless a material decision needs detail:

```text
silhouette before micro-detail
coherent clusters over isolated noise
intentional staircase rhythm
no unjustified banding / hugging / tangents
smallest useful palette
perceptual ramps over isolated swatches
lighting follows form before material response
no unsupported pillow shading
outlines serve separation/form, not automatic decoration
material identity uses value/cluster/highlight behavior, not hue alone
native-size readability outranks zoomed-in prettiness
reference identity outranks decorative invention
```

If any of these becomes the actual defect, load only the corresponding causal owner from the domain README.

## Palette / Ramp Rule

Do not judge palette sophistication by color count.

Use only when useful:

```text
RAMP SHARING
RAMP CROSSING
VALUE COMPRESSION
ACCENT EXCLUSIVITY
PERCEPTUAL CLUSTERING
PALETTE PRUNING
```

Identity colors remain subordinate to readable value structure.

## Edge Topology Rule

Professional edge cleanup considers:

```text
JAGGIES
BANDING
HUGGING
TANGENTS
STAIRCASE RHYTHM
CURVE ECONOMY
CORNER CONTROL
CLUSTER INTERLOCK
```

Do not mechanically smooth every diagonal. Preserve deliberate rhythm appropriate to the form and target style.

## Shading Rule

Use:

```text
LIGHT SOURCE
→ FORM / PLANES
→ SHADOW MASS
→ LIGHT MASS
→ MATERIAL RESPONSE
```

Do not shade enclosed shapes as dark-edge-to-bright-center pillows unless the actual form/light evidence supports it.

## Outline Rule

When outlining is part of the style, distinguish function where applicable:

```text
OUTER CONTOUR
INTERNAL CONTOUR
CONTACT EDGE
LIGHT-FACING EDGE
SHADOW EDGE
BACKGROUND-DEPENDENT EDGE
```

Avoid treating every internal boundary with the same outline weight.

## Style / Series Rule

For related assets, reuse one compact `style_lock_id` and only decision-relevant fields from:

```text
docs/02-reference/pixel-art/style-lock.md
```

Do not retransmit prior prompts, full asset history, or full Pixel Art docs for each new icon.

Subject-specific exceptions are allowed when recognition/material behavior requires them; exceptions do not silently redefine the family grammar.

## Revision Rule

Bounded revision requires:

```text
CHANGE
PRESERVE
```

Preserve all still-valid accepted identity/style fields by default. Do not redesign unrelated regions during a correction.

Detailed normalization is owned by:

```text
docs/02-reference/pixel-art/prompt-contract.md
```

## Minimal Owner Loading

Do **not** preload the Pixel Art corpus.

Start with one primary owner selected from the domain README.

Typical bundles:

```text
simple icon
→ SKILL + iconography.md

object / prop
→ SKILL + object-prop.md

reference conversion
→ SKILL + reference-conversion.md

Minecraft target
→ SKILL + relevant artifact owner
→ minecraft-compatibility.md only when target-specific rules matter

sprite
→ SKILL + sprites.md
→ animation.md only when frame motion is requested

tile / repeat
→ SKILL + tiles-patterns.md

existing asset correction
→ SKILL + audit-revision.md
→ one causal technical owner
```

Load `grid-clusters.md`, `palette-material.md`, `shading.md`, or `style-language.md` only when that specific craft decision is material.

Add a second technical owner only when a real dependency changes the next decision.

Load `qa.md` near finalization, not after every pixel mutation. Load `delivery.md` only for packaging or downstream handoff.

## Minecraft Modes

`MINECRAFT_NATIVE`:

```text
compact palette
strong silhouette
large readable clusters
restrained detail
vanilla-compatible abstraction
family-specific visual grammar
```

`MIVUBI_HD_PIXEL`:

```text
strict grid retained
richer controlled material definition
refined clusters / edge topology
strong normal-scale readability
Minecraft abstraction retained
no painterly gradients or micro-noise inflation
```

Detailed target guidance lives in `minecraft-compatibility.md`.

For block textures, macro repetition matters. A tile that is locally clean but produces obvious wallpaper landmarks in repeated fields is not complete.

## Reference Conversion

Treat source imagery as evidence, not as a bitmap to pixelate.

Priority:

```text
silhouette
→ proportion
→ identity landmark
→ material distinction
→ color identity
→ secondary detail
```

Simplify unsupported detail rather than inventing complexity.

## QA

Near finalization, load `qa.md` and evaluate applicable gates once.

Minimum concerns:

```text
grid integrity
silhouette readability
cluster coherence
edge topology
palette / ramp economy
pixel-scale consistency
shading causality
material readability
identity fidelity
detail necessity
target / Minecraft-family compatibility
edge/alpha cleanup
style-lock consistency when applicable
frame consistency when animated
tile seam + macro repetition when repeating
```

Verdict:

```text
PASS | REVISE | BLOCKED
```

On `REVISE`, apply the smallest causal correction, then rerun only affected gates.

## Handoff Boundary

Pixel Art is Reference Preparation, not a Control authoring stage.

```text
Pixel Art → Texturing
```

Pass approved visual constraints only. Texturing owns UV, atlas, Blockbench texture state, render/material state, and mapped verification.

```text
Pixel Art → Particle
```

Pass texture/frame visual facts only. Particle owns emitter, lifecycle, motion, Molang, collision, and events.

Exact compact handoff shape is owned by:

```text
docs/02-reference/pixel-art/delivery.md
```

Do not carry the entire Pixel Art corpus downstream.

## Evidence Classes

Preserve:

```text
USER_REQUIREMENT
REFERENCE_SUPPORTED
EXISTING_STYLE_SUPPORTED
PROVISIONAL
```

Never present provisional dimensions, palette, light direction, or style interpretation as user-approved truth.

## Stop Condition

Stop Pixel Art authoring when:
- the requested artifact is produced/revised;
- applicable QA reaches the available proof ceiling;
- unresolved blockers are explicit;
- requested delivery/handoff is complete;
- no downstream Texturing/Particle/Blockbench ownership is being duplicated.
