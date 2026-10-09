# Contributing to LazyDesigner

LazyDesigner is developed on the `Local` branch and promoted to `main` only by explicit maintainer instruction. Keep contributions small, evidence-driven, and aligned with repository owners instead of introducing parallel workflows or frameworks.

## Branch model

```text
Local  → active development / working authority
main   → stable / release authority
```

Maintainers normally work directly on `Local`. External contributions should target `Local` unless a maintainer explicitly requests another base. Do not target or modify `main` as part of ordinary development; promotion to `main` uses `Release Verify`.

## Execution context

Before implementation, classify the capability actually available:

```text
REMOTE_GITHUB   → repository/GitHub + CI only
LOCAL_CODE      → local checkout + Bun/tests/build/generators/filesystem
LIVE_BLOCKBENCH → LOCAL_CODE + deployed/reloaded LazyDesigner + reconnected live MCP
```

Use `CONTEXT: ...` or `SWITCH CONTEXT: ...` when useful. The label does not create capability; root `AGENTS.md` owns proof ceilings and fail-safe defaults. Do not claim local/runtime proof from `REMOTE_GITHUB`, and do not treat `LIVE_BLOCKBENCH` as automatic activation of formal Local Acceptance.

## Before changing code

Start from the smallest owner that can actually explain the requested change:

- documentation router → `docs/README.md`;
- repository routing and task class → `AGENTS.md`;
- GitHub delivery/history/CI/security → `GITHUB_RULES.md`;
- stable product facts → `CONTEXT.md`;
- current continuation → `docs/05-operations/next-action.md` only when material;
- current proof interpretation → `docs/05-operations/current-validation.md`;
- source/tool ownership → `docs/04-system/implementation-map.md`;
- material development discipline and permission preflight → `docs/04-system/development-operating-standard.md`;
- MCP package implementation → `mcp/AGENTS.md`;
- persistent asset work → `workspace/README.md`.

Do not broad-read the repository or historical material for reassurance. Fix the first wrong owner and keep unrelated cleanup outside the change.

## Verification

Use the cheapest check that can falsify the changed claim. From `mcp/`, canonical verifier composition is owned by `package.json`:

```text
repository/static policy → bun run verify:repository
authoring/static policy  → bun run verify:authoring
executable/public MCP    → bun run verify:mcp
main release boundary    → bun run verify:release
```

Install the locked dependency surface required by the selected verifier. During iteration, prefer a targeted `bun test <file>` or primitive command; do not run a full verifier merely because a Markdown or routing file changed.

Live Blockbench, visual, playback, persistence, installed-plugin, and client-registry claims require matching `LIVE_BLOCKBENCH` evidence.

## CI behavior

GitHub Actions verification is **manual-only and on demand**. A normal `Local` push does not start tests, conformance, security audit, packaging or release checks. Prefer exact-head source inspection and the smallest relevant existing verifier; do not trigger CI as a post-commit ritual.

- `Repository Verify` checks repository/routing/static contracts.
- `Authoring Policy Verify` checks Reference/Authoring and specialist contracts.
- `MCP Verify` runs `bun run verify:full` on demand with exact-SHA build provenance; it excludes installed/native/visual acceptance.
- `Dependency Security`, `MCP Conformance`, `Desktop Verify`, `Managed Distribution`, `Head Proof`, and `Release Verify` remain optional proof tools.
- Tag-based draft releases and Desktop signing still require their existing release/source/security approvals; manual dispatch is not permission to publish.
- Completed matching-SHA steps alone count as executable proof; skipped or historical runs do not.
- GitHub registers manual workflows on the default branch. If `main` lacks a Local-only workflow, changing `main` or settings needs separate explicit authority.

## Generated files

Generated MCP API documentation and prompt manifests follow their canonical source + generator. Do not hand-edit generated output to make a verifier pass.

Transient captures, previews, sample renders, caches, and per-mutation screenshots do not belong at repository root. Use existing ignored `.cache/` locations under persistent workspace or `Experimental/` work when temporary visual/debug evidence is needed.

## Commit discipline

One coherent outcome should normally be one reviewable commit.

```text
feat:      new capability
fix:       behavior correction
refactor:  behavior-preserving restructuring
docs:      documentation/policy-only change
test:      test-contract-only change
ci:        workflow/CI change
build:     dependency/toolchain change
chore:     bounded maintenance when no better category fits
```

Do not create checkpoint commits, transfer experiments, placeholder files, temporary workflows, or compatibility layers solely to move data through GitHub.

Material logical commits include `Work`, `State`, and `Proof`, with `Decision`, `Unresolved`, and `Next` only when material. Git owns prior revisions; current repository continuation stays with `docs/05-operations/next-action.md`.

## Repository hygiene

- never commit credentials, tokens, private keys, or local `.env` values;
- keep dependencies and action revisions pinned according to current repository policy;
- keep `workspace/active/<project>/README.md` resume-critical rather than chronological;
- prefer one current editable `.bbmodel` per persistent asset package;
- keep discarded iterations and retired repository state in Git history instead of parallel live archives;
- do not add new skills, routers, profiles, manifests, registries, or framework layers without a demonstrated requirement.

## License

LazyDesigner is distributed under the GNU General Public License v3.0. See `LICENSE` for the full terms.
