# Texture Runtime Extensions

This directory owns post-registration Runtime augmentation for texture capabilities.

```text
quality.ts    quality/PBR-aware Runtime enrichment
authoring.ts  texture authoring diagnostics and Runtime enrichment
alpha.ts      render-aware alpha evidence enrichment
```

Base texture tools remain under `server/tools`. Extension composition and ordering remain owned by `server/runtime/extensions.ts`.

Historical `server/tools/texture-*-runtime.ts` paths are compatibility re-exports only. Do not add new implementation to those wrappers.
