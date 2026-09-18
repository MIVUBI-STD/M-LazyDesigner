# GitHub Rules — LazyDesigner

Canonical GitHub operating rules for AI/ChatGPT in this repository. Root and nearest `AGENTS.md` files may narrow domain behavior, but they must not weaken safety, integrity, proof, efficiency, history, security, GitHub-first execution, or STOP boundaries.

`Local` is the working repository authority unless the user explicitly changes it.

## How to use this file

Apply Core Rules 1–7 in order. Root `AGENTS.md` classifies the execution context before task class.

```text
PIN
→ EXECUTION CONTEXT
→ EXHAUST REMOTE_GITHUB PARTITION
→ READ MINIMUM
→ DIAGNOSE
→ TOOL + TRANSFER GATE
→ WRITE ONCE
→ VERIFY + FAILURE POLICY
→ STOP
```

# Core Rules

## 1. PIN — establish exact current authority

Before a material change, know the repository, intended ref, current HEAD when materially relevant, scope, and whether the target is writable.

- **`Local` is the working repository authority. Never silently fall back to another ref.**
- Direct branch/file fetch is current-state authority; search is discovery.
- Every supported write explicitly targets the intended ref.
- `main`, protected, production, release, archived, or read-only refs are not write targets without explicit authority.
- Replacement/deletion uses current content/blob authority from the exact target branch.
- Re-check HEAD only when concurrency is plausible or immediately before a ref move that could overwrite newer work.
- Current source plus relevant proof outranks stale continuation prose.

### Execution context / proof ceiling

Classify by actual capability, not UI/product name:

```text
REMOTE_GITHUB   = repository/GitHub + CI evidence; no local worktree/Bun/installed Blockbench
LOCAL_CODE      = local checkout + Bun/tests/build/generators/filesystem
LIVE_BLOCKBENCH = LOCAL_CODE + deployed/reloaded LazyDesigner + reconnected live MCP client
```

- `REMOTE_GITHUB` may implement changes whose requested acceptance is source/static/CI-verifiable.
- `LOCAL_CODE` additionally owns canonical local generators, filesystem proof, and work that genuinely requires an executable development workspace.
- `LIVE_BLOCKBENCH` is required for installed build identity, native Blockbench Undo/playback/persistence, and live visual/runtime claims.
- GitHub Actions may verify repository contracts and may emit bounded exact-SHA build artifacts with provenance. CI is not a substitute for generator-authored committed output, source writeback, or live Blockbench proof.

### GitHub-first execution partition

`REMOTE_GITHUB` is the default repository-development workbench whenever the current ChatGPT/GitHub capability can read/write the intended ref and CI can falsify the claim. **Do not transfer the whole task merely because one dependent requires `LOCAL_CODE` or `LIVE_BLOCKBENCH`.**

Before any higher-context handoff, partition the requested outcome:

```text
GitHub-verifiable
→ exact-source diagnosis/design
→ implementation that does not require unavailable generated output
→ regression/static/integration tests
→ CI routing + security/provenance
→ deterministic fixtures/harness/evidence-capture preparation
→ exact-SHA source/build artifact when CI can produce it read-only

higher-context residue
→ canonical generated output that must be authored in a capable workspace
→ dependency/lockfile or filesystem mutation requiring the toolchain
→ installed-runtime/native Blockbench/visual proof
```

Rules:

- Exhaust the GitHub-verifiable partition first. A higher-context residue is **not** permission to postpone independent source/test/harness/provenance work.
- Prebuild the local/live test procedure in the repository when deterministic scripting can reduce later interactive work.
- Hand off only the **minimum residue** with exact inputs, commands/actions, acceptance, and `do not redo` guidance.
- Never claim that a prepared harness, CI artifact, static fixture, or source test performed the higher-context action itself.
- If a canonical source edit cannot be complete without generated output unavailable here, do not move `Local` with that incomplete edit. Finish all independent GitHub-side preparation, then hand off only that canonical edit/generation residue.

### Device-independent source acceptance

`verify:repository`, `verify:authoring`, `verify:mcp`, and `verify:full` verify repository/source contracts; none implies installed Blockbench proof.

For a full source gate, accept a completed successful `verify:full`, or completed successful `verify:repository` + `verify:mcp` on the same exact `Local` SHA. The latter is composite source evidence, not an executed `verify:full`. A narrower task needs only its owning verifier.

Record repository/ref, commit SHA, run/job, canonical command, and conclusion when reporting evidence. Require actual successful steps under the pinned toolchain/lockfile where applicable; a green parent/workflow with skipped required checks is insufficient. Do not combine different SHAs or substitute ancestor success.

Do not rerun an accepted source check locally solely because it ran in CI. Reuse requires a clean matching checkout; changed source/package inputs invalidate reuse. Environment-specific failures require corresponding targeted environment proof. Missing checks remain missing; do not create commits/temporary workflows just to trigger them.

A cloud development workspace can satisfy `LOCAL_CODE` when its exact checkout, Bun, generators and filesystem execution are actually available. It need not be the user's PC. A product name or an unconnected workspace is not capability proof. Canonical generated output must still be authored in a capable development workspace and committed with its source; Actions remains verification/artifact infrastructure, not a source editor/writeback path. `LIVE_BLOCKBENCH` remains separately required for installed/native/visual proof.

Installed-plugin identity, native Undo/playback/persistence, Gateway lifecycle and visual claims still require matching `LIVE_BLOCKBENCH` evidence. Report `LOCAL PROOF REQUIRED` only for genuinely missing local/live proof, not for an already accepted CI source gate.

## 2. READ MINIMUM — read only what can change the decision

After the reusable boot, default to:

```text
owner/source files   1–3
history reads        0
broad scans          0
```

- Prefer direct fetch when the exact path is known.
- For a named MCP defect, use `docs/04-system/implementation-map.md` before broad search.
- Open more only for a concrete unresolved question.
- Truncated, paginated, partial, or capped output is incomplete evidence, not proof of absence.
- Verify exact repository/ref/access once before concluding a target is absent.
- Read history only when rationale or regression origin can change the decision.

## 3. DIAGNOSE — fix the first wrong owner

Establish actual vs expected behavior before writing.

```text
requirement / policy / meaning wrong
→ semantic or policy owner

implementation wrong
→ implementation owner — IMPLEMENTATION REGRESSION

implementation correct + assertion stale
→ test owner — STALE TEST

implementation/test correct + CI routing wrong
→ workflow or repository policy — ROUTING FAILURE

runtime/toolchain unavailable
→ environment or capability owner — ENVIRONMENT FAILURE

requested proof missing
→ proof owner — PROOF FAILURE

derived artifact wrong
→ upstream canonical owner
```

- Do not widen maintenance into redesign.
- Do not perform unrelated cleanup, dependency upgrades, compatibility work, framework creation, or documentation synchronization unless required by the same logical outcome.
- CI failure is evidence to diagnose, not permission to change the easiest file.
- Historical TODOs, audits, interrupted candidates, and old experiments are inactive unless reproduced or explicitly reactivated.
- `No change required` is valid.
- Do not add routers, profiles, generic evaluators, alternate transports, persistent registries, compilers/planners, or generalized recovery systems without current evidence.

## 4. TOOL + TRANSFER GATE — choose a method that fits

Choose the simplest method that completes the largest valid partition inside the current execution-context ceiling. Escalation is by **residue**, not by whole task.

```text
REMOTE_GITHUB
→ exact current file/branch state: direct GitHub fetch
→ bounded UTF-8 edit: Contents API
→ coherent multi-file UTF-8 change: atomic Git delivery
→ CI diagnosis: run → failing job/step → relevant log
→ verified exact-SHA build artifact: read-only CI + provenance + artifact upload

LOCAL_CODE
→ canonical generator / dependency lock / filesystem-heavy mutation
→ precise local patch only for residue that GitHub could not complete

LIVE_BLOCKBENCH
→ installed plugin / Blockbench native / visual / local-runtime claim
→ execute the already-prepared bounded harness where possible

required completion exceeds current context
→ finish GitHub-valid partition → Execution Handoff of minimum residue
```

### ChatGPT atomic Git delivery

Use low-level Git-data operations only after the complete coherent text change is ready.

```text
pin exact Local HEAD + base tree
→ fetch required exact owners
→ finish reasoning/coding before repository mutation
→ prepare all final replacement blobs
→ create one tree from the base tree
→ keep Local unchanged during preparation
→ re-check HEAD once before final movement when concurrency is plausible
→ create one categorized logical commit
→ fast-forward Local once
→ run relevant final verification
→ STOP
```

Requirements:

- Complete intended file set and final contents are known before the first ref movement.
- Full-file replacement requires exact complete current content; never reconstruct unseen source from snippets.
- One logical change produces one reviewable commit, not candidate/checkpoint/retry commits.
- Unreferenced blobs/tree are allowed only as preparation for that already-complete delivery.
- If a required generated artifact or native result is unavailable, do not publish an incomplete canonical change. Preserve completed independent GitHub work and hand off only the generation/runtime residue.

### Transfer prohibitions

Connector limitations must not change repository/product architecture.

Never use placeholders, temporary loaders, artificial fragments, base64 stand-ins, transfer-only manifests, temporary branches/workflows, alternate repository structures, generated wrappers, scratch files, or Git-object chains solely to bypass an unsupported payload.

Also:

- Never split `update_file`; it replaces the whole file.
- Keep blob/content SHA, commit SHA, tree SHA, ref, workflow-run ID, artifact ID, and job ID distinct.
- Low-level Git is not an iterative scratch editor or retry strategy.
- Never force-push, rewrite history, destructive-reset, or change repository structure to work around stale state, CI failure, connector limits, or messy history.
- GitHub Actions is verification/deployment/artifact infrastructure, not a remote shell, source editor, generator-authoring path, or transfer hack. Exact-SHA verified build artifacts are allowed when they are read-only outputs with explicit provenance and no commit-back.

### Execution Handoff

Use only for the remaining delivery/proof above the current context. Provide:

```text
FROM_CONTEXT: REMOTE_GITHUB | LOCAL_CODE
TO_CONTEXT: LOCAL_CODE | LIVE_BLOCKBENCH
repository
branch/ref
pinned HEAD
GitHub-completed
residue only
why higher capability is intrinsically required
first command/action
acceptance
do not redo
```

Do not claim local/runtime completion until the receiving context actually executes it. Do not ask the receiving context to repeat accepted source/CI checks or redesign a harness already prepared here.

## 5. WRITE ONCE — deliver one meaningful logical state

Before the first repository mutation:

```text
repo/ref/current state pinned
scope + owners final
complete final contents ready
no scratch/temporary paths
selected method carries whole GitHub-valid delivery
expected relevant proof known

any NO
→ DO NOT WRITE
```

- One intentional write per file is the default; one logical task is one commit by default.
- Same-file/overlapping mutations are serial.
- For coherent multi-file work, know the full file set and hardest artifact before any ref movement.
- Do not partially synchronize a baseline that must remain coherent.
- A successful mutation response is usable current state; do not immediately refetch for reassurance.
- If HEAD moves materially, refetch affected state and rebuild from current authority.
- Keep one canonical owner per durable rule/state where practical.
- Update README/status/continuation/proof only when the state it owns actually changes.
- Preserve lockfiles, runtime/version constraints, and pinned/trusted action versions unless they are the actual owner.
- New files, workflows, abstractions, fixtures, reports, branches, PRs, issues, comments, labels, and releases default to zero unless scope proves a need.
- Generated MCP API docs follow canonical source + generator; never hand-edit them to obtain green status.
- `Experimental/` evidence is not production capability or local-acceptance proof.

### Commit discipline

A commit is a categorized logical delivery, not a save, checkpoint, CI trigger, transfer experiment, or proof marker.

```text
prepare complete logical change
→ cheapest relevant pre-commit proof
→ review intended state/diff
→ one categorized logical commit
→ push/ref update once
→ relevant CI
→ STOP or hand off only named residue
```

Message format: `<type>(<optional-scope>): <concise logical outcome>`.

Use `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `build`, `release`, or bounded `chore`. Split commits only for genuinely independent outcomes. Never split by file, tool call, technical layer, discovery order, or transfer limitation. Do not rewrite published/shared history merely for aesthetics.

## 6. VERIFY + FAILURE POLICY — prove only what matters

Validation is evidence, not ceremony.

- Run the cheapest check that can falsify the changed claim.
- Use targeted checks during iteration.
- Use the full MCP suite once on final state only when executable/public MCP contracts can actually be affected.
- Policy/routing/planning/status-only changes use only the repository/static verification that owns those contracts.
- Only completed successful verification is PASS; queued, running, cancelled, skipped, neutral, or superseded is not PASS.
- On failure, inspect the failing job/step and relevant error before editing.
- Do not weaken or bypass a valid verifier merely to get green.
- Regression tests protect material recurring invariants, not cosmetic prose.
- **Static source/CI evidence does not prove live Blockbench behavior**, visual fidelity, persistence, playback, deployment, or local runtime unless those actually ran.
- User-deferred live/local testing stays deferred until explicitly reactivated.

### Failure / retry matrix

| Failure | Action |
|---|---|
| Known capability mismatch / unsupported transfer | STOP that method; **0 retries**; finish other valid GitHub partitions, then hand off residue |
| Permission/safety denial | STOP; **0 retries** unless condition changes |
| Capability genuinely uncertain | at most **1 bounded probe** |
| 422 malformed but valid method | correct once |
| 404 missing/inaccessible | verify exact repo/ref/target once |
| 409 stale/conflict | refetch current state once, then retry from it |
| 429 rate limit | respect retry/reset guidance |
| 5xx/timeout/unknown mutation | inspect target state before retry |
| Same-cause valid-method failure with new evidence | maximum **2 attempts** |

Changing tools, encodings, branches, Git-object types, or representations does not reset retry ceilings.

### Interrupted delivery

If current-task writes already occurred before a block, perform at most one bounded recovery pass: identify changed paths/commits, remove only accidental current-task artifacts when safe, preserve legitimate changes, disclose remaining state, then STOP or hand off. Never rewrite published history to hide an interrupted delivery.

## 7. STOP — completion is terminal

Stop when:

```text
requested GitHub-valid outcome + relevant proof satisfied, and any unavoidable residue is explicitly handed off
→ STOP

confirmed capability mismatch after GitHub-valid partitions are exhausted + minimum-residue handoff delivered
→ STOP

authoritative permission/safety/policy boundary blocks the operation
→ report boundary → STOP
```

Do not automatically audit another layer, synchronize unrelated docs, run another verifier, create proof-of-proof, fix adjacent issues, create GitHub objects for ceremony, promote experimental behavior, resume deferred work, or continue because more tooling exists.

## Default efficiency budget

```text
continuity boot rereads             0 while reusable in-session
owner/source reads                  1–3 after boot
history reads                       0
broad scans                         0
uncertain-capability probe          <= 1
same-cause retry                    <= 2
capability-denial retry             0
transfer strategies                 1 default; 2 maximum
handoff scope                       minimum higher-context residue only
intentional writes/file             1
logical commits/task                1 by default
push/ref updates/task               1 by default
relevant CI                         0–1 per affected proof surface
placeholder/transfer hacks          0
adjacent cleanup                    0
high-impact mutations               0 unless explicitly authorized
```

# LazyDesigner repository boundaries

```text
continuation       → docs/05-operations/next-action.md
proof state        → docs/05-operations/current-validation.md
implementation     → docs/04-system/implementation-map.md
asset continuity   → workspace/active/<project>/README.md
generated API docs → canonical MCP source + generator
research           → Experimental/
```

- `next-action.md` stores only continuation, blockers, deferrals, and the next meaningful repository action.
- `current-validation.md` owns current proof interpretation; static/CI evidence never upgrades live/visual proof.
- When the user defers source work or local testing, record cross-session deferral once when needed and stop.

# Conditional GitHub surfaces

## API failures and ambiguous mutations

Interpret 401 as authentication, 403 as permission/policy/rate-limit, 404 as missing/inaccessible/stale, 409 as conflict/stale state, 422 as invalid request/policy, 429 as rate limiting, and 5xx/timeout as potentially unknown mutation outcome. After an unknown mutation outcome, inspect current target state before retry.

## Special files, generated artifacts, and large transfers

- Distinguish regular UTF-8 files from symlinks, submodules, Git LFS pointers, generated artifacts, binaries, and files outside practical tool limits.
- Never hand-edit an LFS pointer as content.
- Do not rewrite symlinks/submodules/binaries through plain-text replacement unless intended.
- Generated artifacts follow canonical source and generator.
- Compression does not make an unsupported transfer method valid.

## Pull requests, protection, reviews, and merge queues

Before a high-impact PR/merge action, refresh current head/base, mergeability, required reviews/CODEOWNERS, checks, and deployment gates. Repository protection/rules are authority, not errors to bypass.

Branch/tag deletion, PR merge/close, release publication/deletion, environment bypass, settings/permission changes, and history-altering actions require explicit authority and an exact current target.

## GitHub Actions

- Workflows run only on intended events/paths their checks can falsify.
- Correctly skipped irrelevant workflows are not missing proof.
- Required-but-skipped checks are CI/ruleset routing defects, not reasons to change unrelated code.
- Verification workflows are read-only by default and do not commit back to `Local`.
- Read-only CI may upload exact-SHA verified build/test artifacts for later local/live consumption when source SHA, artifact hash/build identity, verifier, and toolchain provenance are explicit. Artifact existence is source/build evidence, not deployment or live proof.
- Do not create one-shot workflows to compensate for missing development/transfer capability.
- Use least-privilege permissions and preserve pinned/trusted action versions.
- Treat event-derived strings as untrusted input; validate or pass them as data, never evaluate them as code.
- Never execute untrusted PR code with secrets/write tokens through `pull_request_target` or privileged persistent runners.

### Approved `Experimental/` runtime exception

An explicitly user-approved bounded repository-owned experimental harness may use Actions as an ephemeral runtime when that runtime is the experiment under test. Keep it under `Experimental/`, read-only by default, bounded to repository-owned inputs, reproducible, artifact-only, and separate from production proof. Artifact existence is not visual approval.

## Sensitive data, releases, and environments

Never commit, paste, echo, or move secrets into source, workflows, issues, PRs, comments, logs, or docs. If protected data is discovered, report location/type without repeating the value. Release/deployment approval gates are authoritative and must not be bypassed.
