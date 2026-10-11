# Data Lifecycle — LazyDesigner

This is the canonical system-level data safety contract. It is not a second
knowledge registry, authoring state machine, database, or migration service.

## Authorities and lifecycle

| Data class | Owner | Policy |
| --- | --- | --- |
| Executable capability/schema | existing mcp/ implementation + manifest | update canonical source, derive projections |
| Authored system/reference knowledge | docs/ | authored policy controls meaning; Markdown index is derived |
| Execution procedure | .agents/skills/ | supports but never overrides source, docs or native state |
| Test fixtures | mcp/tests/fixtures/ and consuming test | change with the owner; verify affected contracts |
| Current proof/continuation | docs/05-operations/ | operational context, never duplicate architecture |
| User-authored assets | native Blockbench project/files | never rewritten by data inventory or metadata tools |
| Desktop project metadata | project_navigation.rs | strict read, bounded staged replacement |

The canonical knowledge compiler remains `mcp/lib/semantic/knowledge.ts`;
capability semantics and invalidation remain under
`mcp/gateway/capabilities/` and `mcp/gateway/development/`. Do not
introduce competing metadata/state sources to aggregate them.

## Read-only inventory

Run `bun run audit:data` from `mcp/`. The script
`mcp/scripts/development/data-inventory.ts` derives JSON using only Git
tracked paths. It records SHA-256 and bytes for authored docs, Skills, JSON
fixtures and pure compatibility re-export facades at `mcp/lib/*.ts`.
It detects alias targets missing from tracked source and returns a nonzero
exit status for those aliases.

Workspace files are **counted only**; neither their contents nor untracked
user files are read. The CLI does not write a registry, cache, or generated
artifact, does not fetch the internet, and is not a backup mechanism.
Neither a filename collision nor a ranking score establishes canonical
ownership. Continue using existing source owners and scoped context loading.

## Knowledge lifecycle and provenance

The canonical `mcp/lib/semantic/knowledge.ts` now offers source-level SHA-256
evidence and a pure section-level revision comparison. A line-number shift
does not invalidate an unchanged section. An explicitly declared external
upstream revision, URL or compatibility change invalidates that source's
sections even when Markdown content remains identical.

External evidence is caller-supplied and requires HTTPS plus an explicit
upstream revision. Compatibility claims use exact Minecraft Bedrock or
Blockbench versions; unknown/unsupported versions are not inferred. This
does not fetch external websites, assert official approval, or alter user
assets. The default knowledge selection remains unchanged; a version filter
is opt-in and fails closed for sources lacking matching evidence.

`bun run generate:knowledge-index` keeps its existing default input paths
and schema-1 output, adding hashed source evidence. Optional
`--previous <report.json>` accepts a bounded, fingerprint-checked previous
report, reuses sections from source files with identical content hashes,
and emits a deterministic revision delta. Older schema-1 reports without
source evidence remain readable but cannot be reused solely by path.
The comparison is read-only and is **not** a background watcher, a second
registry, an automatic remote updater or executable runtime proof.

## Desktop metadata safety

`apps/desktop/src-tauri/src/metadata_io.rs` is restricted to Desktop-owned
small JSON metadata. It writes to an exclusively created temporary file
in the destination directory, flushes the file and renames over the old
destination. It refuses directories and symlink destinations and never
unlinks the old file before committing a replacement.

Preference mutations first require valid schema and known fields. Corrupt,
unsupported, or malformed preferences fail closed without replacing the
original with empty defaults. Unreadable preferences may still display as
an empty read-only projection; they cannot silently become a new saved
configuration. Project identity manifests preserve their existing validation.

These guarantees cover the application metadata writer, **not** Blockbench
native assets, cross-file transactions, multi-process revision locks,
full backup/restore, or absolute power-loss durability. Do not claim native
persistence acceptance from a source-only audit.

## Review / verification

Inventory tests own classification, alias resolution and the no-workspace-read
boundary. Desktop tests own create/replace and unreadable metadata refusal.
Exact-SHA source verification and installed Desktop/Blockbench verification
are separate proof layers; neither is implied by a proposed test.
