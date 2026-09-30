# Generation Scripts

Generated schema/index/documentation artifact commands live here. Generated output remains machine-owned and must not become a second semantic authority.

```text
generate-docs.ts              generated MCP API docs
generate-hybrid4-schemas.ts   generated Hybrid-4 schemas
internal/                     non-runnable helpers used only by generators
```

Runnable files in this directory are package-command entrypoints. Helpers belong under `internal/` and must be explicitly declared by repository ownership tests.
