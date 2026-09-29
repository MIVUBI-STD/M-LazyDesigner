# Texture Runtime Extensions

This directory owns post-registration Runtime augmentation for texture capabilities.

```text
quality.ts    quality/PBR-aware Runtime enrichment
authoring.ts  texture authoring diagnostics and Runtime enrichment
alpha.ts      render-aware alpha evidence enrichment
```

Base texture tools remain under `server/tools`. Extension composition and ordering remain owned by `server/runtime/extensions.ts`.

Historical `server/tools/texture-*-runtime.ts` paths are compatibility re-exports only. Do not add new implementation to those wrappers.


## Mutation ownership

`quality.ts` is diagnostics-only. It may enrich `list_textures`, but it must not wrap or replace material mutation behavior.

```text
texture-materials.ts + canonical PBR planner
→ configure_material
→ assign_texture_channel

runtime/extensions/texture/quality.ts
→ diagnostics only
```

Do not reintroduce a second mutation implementation in the Runtime extension layer.


`authoring.ts` may wrap `manage_material` only to augment the returned authoring status/workflow receipt after calling the original executor. It must not plan or apply PBR membership mutations.
