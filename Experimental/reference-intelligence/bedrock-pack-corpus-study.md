# User-Supplied Bedrock Pack Corpus — Cross-System Study

Status: `OBSERVATION` / `PATTERN` extraction on branch `Ref` only. Not production authority.

## Corpus

User-supplied archives inspected:

1. Bloom — world template
2. Minecraft: Friendly Fishing Add-On
3. Realism Visuals — resource pack
4. Actions & Stuff 1.4 — resource pack
5. Advanced Movement Add-on
6. Advanced Truck Simulator — world template
7. Better on Bedrock 1.1 — world template
8. TNT Arena — world template

## Rights Boundary

Treat every uploaded archive as analysis-only unless redistribution rights are independently verified.

Do not copy third-party models, textures, animations, sounds, scripts, functions, structures, or other payloads into LazyDesigner or another production repository merely because the archive is inspectable.

Use derived measurements, independently expressed architectural observations, generic authoring patterns, negative patterns, and cross-corpus comparisons.

## Corpus Inventory

| Source | JSON | PNG | JS | mcfunction | Geometry | Animation clips | Animation controllers | Primary value |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bloom | 892 | 499 | 0 | 144 | 250 | 47 | 9 | function-driven world/content architecture |
| Friendly Fishing | 1527 | 739 | 1 bundled | 0 | 257 | 246 | 7 | large data-driven add-on + asset families |
| Realism Visuals | 154 | 13 | 0 | 0 | 0 | 33 | 7 | environment/render presentation settings |
| Actions & Stuff 1.4 | 6853 | 9023 | 0 | 0 | 2349 | 1896 | 468 | large resource-only animation/presentation architecture |
| Advanced Movement | 44 | 14 | 9 | 0 | 5 | 212 | 2 | Script API orchestration + movement/action animation |
| Advanced Truck Simulator | 1197 | 402 | 14 | 542 | 548 | 107 | 140 | hybrid scripts + command functions + vehicle/world systems |
| Better on Bedrock 1.1 | 2618 | 1042 | 101 | 53 | 222 | 258 | 51 | modular Script API gameplay/content framework |
| TNT Arena | 1217 | 482 | 0 | 857 | 179 | 964 | 201 | large function/state-machine minigame architecture |

Counts are derived from archive inspection and are evidence of scale/organization only, not quality scores.

## S7 — Bloom

Class: `WORLD_SYSTEM_CORPUS`, primarily function-driven.

Observed structure:
- behavior + resource packs embedded in a world template;
- 144 command functions;
- 310 behavior block definitions and 70 item definitions;
- about 250 Bedrock geometry definitions;
- many plant/furniture/environment models;
- functions grouped around books/guides, upgrades, ambient effects, disposal, world-state operations, and build/content interactions;
- command use is dominated by scoreboard, execute, setblock, tag, title, function, fill, give, sound, and particles.

Generic lessons:
1. A substantial authored world can operate with zero Script API files when deterministic command/function logic is sufficient.
2. Scoreboards + tags can act as a lightweight world-state machine.
3. `setblock` / `fill` / function composition are effective for environment progression and construction-state changes.
4. Large decorative/content libraries can coexist with relatively small animation surfaces.
5. World-template logic should not automatically be converted into Script API merely because scripts are available.

Candidate architectural heuristic:
`deterministic command-sequence/state mutation → functions/scoreboards may be sufficient`
`complex data structures, reusable computation, event abstraction, UI/application logic → Script API becomes more justified`

## S8 — Friendly Fishing Add-On

Class: `CONTENT_HEAVY_ADDON_CORPUS`.

Observed structure:
- about 257 geometry definitions;
- 246 animation clips;
- hundreds of item definitions;
- large recipe set;
- structures and world-generation features;
- fish/animal model families;
- partner-fish families;
- rod/attachable presentation;
- fishermen/NPC-like entities;
- only one bundled JavaScript artifact despite large content scale.

Generic lessons:
1. Content scale can be data-heavy rather than code-heavy.
2. Families of related creatures/items should share conventions and reusable authoring patterns rather than each requiring a novel system.
3. Content generation, recipes, structures, items, entities, and visual assets can scale independently from orchestration code.
4. Model/animation intelligence should distinguish asset-family variation from new architecture.
5. Large catalogues benefit from stable namespaces and repeatable folder/schema organization.

LazyDesigner relevance: strong candidate for future focused study of aquatic creature geometry, repeated fish-family modelling, rod/held-object relationships, attachment/locator usage, small-creature animation families, and family consistency.

## S9 — Realism Visuals

Class: `PRESENTATION_ENVIRONMENT_CORPUS`.

Observed structure:
- 77 client biome definitions;
- 33 fog settings;
- 12 atmosphere settings;
- 9 lighting settings;
- 6 color-grading settings;
- water settings;
- local-lighting settings;
- shadow settings;
- 16x / 32x subpack material.

Generic lessons:
1. Visual quality is not owned only by geometry/texture/animation.
2. Environment presentation has independently authored concerns: atmosphere, fog, lighting, color grading, water, shadows, biome-specific presentation.
3. Presentation variants can be organized as environment profiles instead of duplicating core asset geometry.
4. Resolution/subpack variants should not automatically fork unrelated logic.

Framework relevance: `asset fidelity + world/environment presentation + camera/composition = perceived final quality`.

LazyDesigner itself remains asset-only; this corpus should not expand it into a world-render-settings editor unless product scope explicitly changes.

## S10 — Actions & Stuff 1.4

Class: `RESOURCE_PRESENTATION_CORPUS`.

Observed scale:
- about 2349 geometry definitions;
- 1896 animation clips;
- 468 animation controllers;
- 2911 attachable definitions;
- large render-controller surface;
- more than 9000 PNG files;
- no behavior scripts/functions in the supplied resource archive;
- three large subpack branches.

Generic lessons:
1. A resource-only layer can radically alter presentation while remaining separate from gameplay logic.
2. Large-scale visual replacement relies on mappings among client entities, attachables, geometry, animation, animation controllers, render controllers, and texture variants.
3. Animation-controller complexity can become a first-class presentation architecture.
4. Attachables are a major authored surface, not merely secondary item metadata.
5. Presentation variants/subpacks can scale independently from gameplay code.
6. Opaque/hashed distribution names are not good authoring semantics. Do not learn naming style from packaged/obfuscated artifacts.

LazyDesigner relevance: very strong future study source for player animation, held/worn item presentation, attachable relationships, animation-controller composition, resource-only state-driven presentation, and separation between asset authoring and gameplay implementation.

## S11 — Advanced Movement Add-on

Class: `SCRIPTED_INTERACTION_CORPUS`.

Observed structure:
- five geometry definitions;
- about 212 animation clips;
- nine JavaScript modules;
- script files separated into entry/index, point/util logic, base mob abstraction, cannon, platform, player, rocket, spring;
- animation families include walk, jumps, double jump, flip, climb, spring, cannon, rocket riding, tutorial states;
- a large staged `ride_rocket.N` animation family is present.

Generic lessons:
1. Gameplay complexity does not require geometry complexity.
2. Script classes can own gameplay behavior while animation assets own presentation.
3. A small number of entities/props can support a rich interaction system if responsibilities are cleanly separated.
4. Repeated animation sequences may encode staged choreography/state progression, but clip-count growth must not become a target.
5. Tutorial presentation can reuse the same asset/action vocabulary rather than requiring a separate gameplay system.

Strong cross-project pattern:
`Script API → interaction/state/computation`
`Animation assets → visual motion`
`Geometry → required form only`
`Particles/sounds → feedback`

## S12 — Advanced Truck Simulator

Class: `HYBRID_WORLD_SYSTEM_CORPUS`.

Observed structure:
- 14 JavaScript modules;
- 542 command functions;
- about 548 geometry definitions;
- about 140 animation controllers;
- vehicle/trailer geometry families;
- extensive mission/menu function groups;
- Script API modules for UI/forms, ambience, calculations/vector utilities, effects, configuration, and scripting abstraction;
- substantial dynamic-property use;
- command functions dominated by execute + scoreboard plus title/tag/tp/event/camera/scriptevent.

Function grouping includes approximately 399 mission functions and 124 menu functions, with smaller truck and game-system groups.

Generic lesson: this is a clear hybrid responsibility split.

`JavaScript → reusable computation, forms/UI, config, ambience helpers, dynamic state, abstraction`
`mcfunction → declarative mission/menu sequences, scoreboard transitions, camera/title/event choreography`

Candidate framework principle: do not choose Script API versus mcfunction globally. Choose ownership per responsibility.

Vehicle relevance: future study source for rigid multipart geometry, coupled/uncoupled presentation, trailer attachment, vehicle animation/controller structure, and mechanical clearance.

## S13 — Better on Bedrock 1.1

Class: `MODULAR_ADDON_SYSTEM_CORPUS`.

Observed structure:
- 101 JavaScript modules;
- about 11k JavaScript source lines;
- 53 mcfunctions;
- hundreds of blocks/items/recipes/loot tables;
- many structures and world-generation features/rules;
- creature/entity assets and animation;
- code organized by functional domains.

Observed script areas include custom components, ambience, armor effects, blocks, custom spear, enchantments, entities, goals, items, backpacks, lootbags, configuration, scripting events, and shared utilities/managers.

Generic lessons:
1. Feature-oriented module boundaries scale better than one monolithic script.
2. Cross-cutting utilities should remain shared while feature behavior remains locally owned.
3. Custom components / event routing can provide reusable extension points.
4. Content-heavy add-ons benefit from separating data definitions, feature logic, reusable managers/utils, and presentation assets.
5. World generation is a distinct subsystem from runtime entity/item logic.

AI production relevance: plan by feature ownership, not by file type alone.

Bad: `write all scripts → write all JSON → write all assets`.
Better: `feature → required data → behavior → presentation → persistence/state → validation`.

## S14 — TNT Arena

Class: `FUNCTION_STATE_MACHINE_CORPUS`.

Observed structure:
- 857 mcfunction files;
- no JavaScript;
- about 964 animation clips;
- about 201 animation controllers;
- 179 geometry definitions;
- extensive entity, particle, sound, score/tag/event content;
- command logic dominated by execute, scoreboard, summon, tag, tp, event, function, effects, UI text, sound, fill, and camera shake;
- many packaged file/identifier names are opaque/obfuscated.

Generic lessons:
1. Large minigame/game-loop systems can be implemented with functions + scoreboard/tag/event state without Script API.
2. Function architecture can become very large, so packaged/obfuscated names must not be mistaken for human-authoring best practice.
3. Visual state can be rich even when gameplay state is command-driven.
4. Entity/event choreography is a powerful abstraction for arena mechanics.
5. Opaque packaged identifiers are a negative knowledge source for semantic naming.

Map-framework relevance: strong source for future audit of round lifecycle, arena state, player assignment, entity/event orchestration, scoreboard state machines, respawn/reset, camera/effect feedback, and function-call topology.

## Cross-Corpus Architecture Patterns

### P1 — Choose execution surface by responsibility

The corpus demonstrates successful function-driven, script-driven, and hybrid Bedrock systems. No one style is universally superior.

`simple deterministic command choreography → mcfunction / scoreboard / tags`
`event-rich reusable computation / UI / structured state → Script API`
`large product needing both → explicit hybrid ownership`

Avoid implementing the same state machine independently in both scripts and functions.

### P2 — Data scale is not code scale

Friendly Fishing and Better on Bedrock show that hundreds of content definitions can exist without proportional growth in central orchestration.

`new content instance != new subsystem`

### P3 — Presentation is independently scalable

Realism Visuals and Actions & Stuff demonstrate two separate presentation domains: world/environment presentation and entity/item/animation presentation. Both can become sophisticated without owning gameplay truth.

### P4 — Animation/controller composition is a major architecture surface

Across Actions & Stuff, Advanced Movement, TNT Arena, Friendly Fishing, and Truck Simulator, animation assets and controllers form substantial systems.

For LazyDesigner, clip authoring, hierarchy/pivot readiness, controller composition, artist-facing transitions, and effect cues remain important. Gameplay state authority should remain external.

### P5 — A small geometry surface can support complex behavior

Advanced Movement is the clearest case: `5 geometries + large animation library + modular scripts = rich movement system`.

Therefore model complexity is not product complexity.

### P6 — A large geometry surface can still be primarily content

Friendly Fishing and Bloom show many geometry definitions used as families/catalog content. `many models != deep architecture`.

### P7 — Hybrid architecture should have explicit ownership

Advanced Truck Simulator supports recording state authority, event authority, presentation owner, persistence owner, command/function owner, and script owner without duplicating state.

### P8 — Marketplace/distribution obfuscation is not authoring knowledge

Actions & Stuff and TNT Arena contain many opaque packaged names. Never generalize random identifiers, hashed filenames, or obfuscated namespaces into recommended source naming.

## Knowledge Impact by Project

### LazyDesigner / Blockbench MCP

Highest-value sources:
1. Actions & Stuff — animation/controller/attachable presentation.
2. Advanced Movement — motion/system separation.
3. Friendly Fishing — creature/held-object family consistency.
4. Truck Simulator — vehicle mechanical assets.
5. Better on Bedrock — varied entity/prop content.

Future focused studies should remain asset-authoring-specific.

### AI-Assisted Minecraft Map Production Framework

Highest-value sources:
1. Better on Bedrock — modular add-on architecture.
2. Advanced Truck Simulator — hybrid script/function architecture.
3. TNT Arena — function/scoreboard arena state machine.
4. Bloom — function-driven progression/environment systems.
5. Friendly Fishing — content-heavy addon/worldgen organization.
6. Realism Visuals — environment/presentation layer.
7. Actions & Stuff — resource-only visual layer.
8. Advanced Movement — focused interaction feature architecture.

Together these sources cover world lifecycle, function state machines, Script API modules, hybrid systems, entities/items/blocks, world generation, structures, UI/forms, vehicles, movement mechanics, animation/controllers, attachables, particles/sound, environment rendering, and content-family scaling.

## Current Decision

All eight archives are accepted as valuable analysis-only reference corpus.

No raw uploaded payload is promoted into the repository.

The strongest new generic knowledge is architectural:

> Bedrock production quality improves when gameplay state, reusable computation, deterministic command choreography, asset presentation, and environment presentation have explicit owners rather than being collapsed into one implementation surface.

Next deep audits should be question-driven rather than exhaustive. Retrieve only the corpus slice relevant to the current unresolved production problem.