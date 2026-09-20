# Local Acceptance Runbook

Updated: 2026-09-19  
Owner: `LIVE_BLOCKBENCH` formal acceptance procedure  
Current state: native LazyDesigner authoring path only.

This procedure is now **ACTIVE** for the current Local handoff. `LIVE_BLOCKBENCH` is an execution capability; it does not by itself prove acceptance.

Use only for native residue; prepare source proof and deterministic fixtures first.

## 1. Acceptance Contract

```text
Goal
Success Metric
Forbidden Proxy / Non-Goal
First Evidence Required
GitHub-completed
Higher-context residue
Proof Required
STOP Condition
```

Source/CI is not visual proof. Static Footprint is a guardrail; Authoring Efficiency measures Cost to Accepted Result after the quality gate passes. User-stopped tests stay stopped.

## 2. Pin Local State

Remote source baseline prepared for handoff:

```text
repository: MIVUBI-STD/M-LazyDesigner
branch: Local
remote-verified SHA: 7d3abf40238373461085fac179fcbbc07a7da300
Head Proof: PASS
MCP Verify: PASS
MCP Conformance: PASS
Managed Distribution: PASS
```

On the local machine:

```bash
git switch Local
git pull --ff-only
git status --short
git rev-parse HEAD
```

Require:

```text
HEAD == 7d3abf40238373461085fac179fcbbc07a7da300
working tree clean
```

If HEAD differs because Local advanced after this handoff, use the newer exact-head proof instead of forcing/resetting history. Do not reuse this baseline across a changed source/package state.

## 3. Source Closure

Use the full source gate in `GITHUB_RULES.md`: successful `verify:full`, or successful `verify:repository` + `verify:mcp` on the same exact `Local` SHA. Reuse only for a clean matching HEAD with no source/package edits.

Install pinned local dependencies once:

```bash
cd mcp
bun install --frozen-lockfile
```

For a clean checkout exactly matching the remote-verified SHA above, **do not rerun `verify:full` merely to repeat accepted CI proof**.

Run local source verification only when:
- local source/package inputs changed;
- local toolchain behavior itself is under investigation; or
- a later exact SHA lacks accepted source proof.

Then use:

```bash
bun run verify:full
```

## 4. Deploy Exact Plugin

Before the first native load, run `bun run setup:tls` from `mcp/`. The native endpoint is `https://127.0.0.1:3000/bb-mcp`; Blockbench, Gateway and live scripts must share the machine-local TLS identity. Follow [TLS setup](../../mcp/README.md#normal-client-boundary). Do not disable certificate verification or import this certificate into the system trust store. An old Gateway process must be replaced once for this transport migration; normal Runtime reload recovery remains beneath the persistent new Gateway.

A successful `MCP Verify` may publish `blockit-mcp-verified` containing `blockit_mcp.js` and provenance. Prefer a matching exact-SHA artifact when available.

```bash
bun run deploy:verified -- /absolute/path/to/artifact-dir /absolute/path/to/blockit_mcp.js
```

Fallback for intentionally unpushed local source:

```bash
bun run deploy:local -- /absolute/path/to/blockit_mcp.js
```

Preserve unsaved projects/assets/settings/credentials/other plugins. Do not use `git clean -xfd`.

## 5. Local-code Smoke Gate

Before deploying into Blockbench, run only the environment-specific checks that CI cannot prove on this machine:

```bash
bun --version
bun run typecheck
bun run typecheck:gateway
```

Expected Bun version is owned by `.bun-version`. A local-only toolchain/environment failure must be fixed as an environment issue; do not redesign product architecture to make the machine pass.

If these commands pass on an unchanged checkout, continue to deployment.

## 6. Native Runtime Preflight

Geometry/Texturing/Animation/Persistence/quality-fixture live verifiers share one preflight: installed `build_identity`, stable instance/startup identity, phase, stateless transport, initialize contract, `tools/list`, required tools, and forbidden-tool absence.

`verify:stateless-local` is diagnostic only when that shared preflight fails or exact full-surface diagnosis is explicitly required. Do not run it automatically before every live verifier.

## 6A. Desktop Control Plane Acceptance

Before the authoring sequence, validate the Desktop controller itself from a clean checkout at the exact current `Local` SHA. This is separate from authoring-quality proof.

Use a disposable workstation/profile only for destructive fault injection. Do not modify production Blockbench plugins or active project assets.

### First-run lifecycle

```text
install Desktop
→ launch LazyDesigner
→ Set up
→ bundled managed install completes
→ Blockbench opens through ensure_ready
→ perform native Blockbench local-plugin approval if requested
→ Desktop reaches RUNTIME_READY or READY
```

Record whether approval was required. Approval may occur once; bypassing Blockbench trust is not acceptance.

### Repeat-launch lifecycle

```text
close Desktop normally
→ reopen Desktop
→ no repeated plugin approval

close Blockbench normally
→ choose Open in LazyDesigner
→ ensure_ready launches Blockbench
→ Runtime returns without manual Refresh

restart Desktop while Blockbench/Runtime are already healthy
→ state reconstructs correctly
```

### Recovery matrix

Prove each applicable state independently:

```text
managed plugin missing + Blockbench closed
→ safe repair
→ Open/Prepare reaches Runtime

managed plugin modified
→ fail closed
→ no silent overwrite

managed plugin missing + Blockbench running
→ no forced repair
→ no forced Blockbench close

Runtime online + Gateway absent
→ client-wait / RUNTIME_READY
→ not an error

Gateway attaches
→ READY

custom absolute Blockbench --userData
→ plugin destination remains that profile

two simultaneous Blockbench processes with different userData profiles
→ setup refuses safely
```

For the two fault-injection cases involving plugin deletion/modification, use a disposable managed installation and restore it afterward through the canonical manager.

### Watcher / latency behavior

Keep LazyDesigner open and verify:

```text
Blockbench close/open
Runtime offline/online
Gateway attach/detach
```

The UI should update without manual Refresh. A transient Gateway fast-probe failure must preserve the last known full projection rather than falsely showing offline. The heartbeat must not spawn `blockit.exe status` continuously; full status refresh is expected only when a known fast-probe value changes or an explicit action requests it.

Validate Runtime health authority separately:

```text
default Blockbench Runtime settings + default MCP client URL
→ Runtime reaches ready

matching custom Blockbench port/path + matching BLOCKIT_RUNTIME_URL
→ Runtime reaches ready on the custom endpoint

Blockbench listener URL differs from the MCP client Runtime URL
→ fail closed
→ Desktop does not report ready
→ readiness identifies a local connection-settings mismatch

unrelated process occupies 127.0.0.1:3000 while LazyDesigner Runtime is absent
→ Desktop does not report Runtime ready

RuntimeHost fails to bind
→ no live Runtime session lease
→ Desktop remains not ready

Runtime crashes or Blockbench exits
→ Runtime session lease expires/disappears
→ maintenance never treats a live listener as idle
```

### Projects & Models synchronization

With one disposable Project containing at least two saved `.bbmodel` files, verify only the user-visible synchronization contract:

```text
open Model A
→ Active Project/Model matches Blockbench

open Model B in another Blockbench tab
→ Model B appears in the same Project
→ non-active open model uses Switch, not duplicate Open

switch A ↔ B in Blockbench
→ Desktop follows automatically without manual Refresh

modify active model without saving
→ Desktop shows Modified
→ save
→ Modified disappears

Save As to a new .bbmodel path
→ Desktop follows the new model identity/path-backed Project grouping

close one model
→ its open state clears
→ recent saved navigation remains available

click Switch for an already-open model
→ Blockbench selects the existing tab
→ no duplicate project tab is created

pin an older Project, then close Blockbench after working in a newer saved model
→ Continue points to the newer last active model
→ Pin affects Recent ordering only

move/delete the exact last active model while Blockbench is closed
→ Continue is absent
→ Desktop does not guess another recent/pinned model

Runtime reconnect while Blockbench/plugin remain alive
→ Active/Open/Modified remain stable
→ no false project-session drop

stop/unload the Plugin while Blockbench remains open
→ project lease expires within the bounded TTL
→ Active/Open/Modified clear
→ Recent saved navigation remains

custom Blockbench --userData profile
→ Plugin writes a profile-scoped navigation snapshot
→ Desktop follows only the managed plugin profile

another Blockbench profile writes its own snapshot
→ managed profile navigation is not replaced or cross-contaminated
```

Do not add or validate viewport, selection, Undo, timeline, brush, panel, or other editor-session state in Desktop. Those remain Blockbench-owned and intentionally absent from the normal UI.

### Desktop evidence

Retain:

```text
exact git SHA
Desktop version
Blockbench version
managed source SHA
first-run approval required: yes/no
ensure_ready final outcome
plugin integrity state
Runtime state
Gateway state
custom userData case if tested
PASS / FAIL + first failing assertion
```

Desktop acceptance does not prove Geometry/Texturing/Animation quality. Continue with the native authoring sequence only after controller behavior is stable.

## 7. Prepared Native Sequence

Use the repository-owned disposable harness; do not redesign tests in Blockbench.

```text
shared AUTHORING
→ verify:geometry-live -- --confirm-disposable
→ UV readiness preflight
→ user Geometry APPROVED
→ UV Layout PASS
→ verify:texturing-live -- --confirm-disposable
→ Texturing → Texture APPROVED
→ Animation readiness preflight
→ AUTHORING→Animation handoff
→ verify:animation-live -- --confirm-disposable
→ verify:persistence-live -- --prepare --confirm-disposable
→ one native close/reopen
→ verify:persistence-live -- --verify --confirm-disposable
```

Geometry↔Texturing stays on the shared AUTHORING surface; no phase bounce. The readiness preflights are workflow checks, not new harness commands or approval states.

Synthetic readiness never proves user asset approval. Tool/export success, low call count, or a scalar score cannot override **QUALITY FAIL**.



### Recommended execution order for this handoff

Run from `mcp/` after the exact verified plugin is deployed and Blockbench is open.

Start with transport/runtime identity only:

```bash
bun run verify:stateless-local
```

Then test project affinity before authoring mutations:

```bash
bun run verify:project-affinity-live -- --confirm-disposable
```

Keep the shared Geometry→Texturing→Animation fixture together:

```bash
bun run verify:geometry-live -- --confirm-disposable
bun run verify:texturing-live -- --confirm-disposable
```

Save a `.bbmodel` checkpoint whose basename is `blockit_geometry_e2e_disposable` (native export updates the project name). Perform the documented Gateway AUTHORING→Animation handoff with actual disposable-test readiness evidence, not a fabricated user-approval claim. Continue without replacing that Gateway:

```bash
bun run verify:animation-live -- --confirm-disposable
bun run verify:particle-live -- --confirm-disposable
```

Persistence is two-stage:

```bash
bun run verify:persistence-live -- --prepare --confirm-disposable
```

Then close/reopen the prepared fixture exactly as instructed by the script and run:

```bash
bun run verify:persistence-live -- --verify --confirm-disposable
```

Run independent fixtures only after the shared-fixture persistence sequence. Save the active disposable fixture before a verifier that intentionally refuses unsaved work; do not relax that safety guard:

```bash
bun run verify:surface-gap-live -- --confirm-disposable
# Save the surface-gap disposable fixture to a new .bbmodel path.
bun run verify:template-live -- --confirm-disposable
bun run verify:uv-density-live -- --confirm-disposable
bun run verify:texture-runtime-live -- --confirm-disposable
```

For UV-density persistence, close/reopen its saved fixture and run:

```bash
bun run verify:uv-density-live -- --verify-reopen --confirm-disposable
```

### Lifecycle / recovery proof

Keep the same Gateway/client task active while exercising:

```text
Runtime/plugin reload
→ Gateway remains the client boundary
→ Runtime reconnects below it

Geometry → Texturing
→ shared AUTHORING surface remains semantically identical

AUTHORING → Animation → AUTHORING
→ catalog changes and returns correctly

Blockbench close → open
→ Gateway survives temporary Runtime loss
→ no silent project rebind
```

Do not restart the Gateway merely to make a failing recovery scenario pass.

### Evidence to record

For each command, retain:

```text
exact git SHA
installed build_identity
Gateway/runtime instance identity
command
PASS / FAIL
first failing assertion if any
project UUID
authoring phase
queue/operation timing from Gateway status when relevant
script-reported call metrics
saved fixture/checkpoint path when produced
```

Do not convert technical PASS into visual/reference approval.

### Safety boundary

Use only disposable fixtures for scripts that require `--confirm-disposable`.

Do not run destructive acceptance commands against:
- an unsaved production model;
- the rejected/approved source fixture itself;
- a project whose current state is not backed up.

If a mutation becomes `OUTCOME_UNKNOWN`, inspect the current Blockbench state before any retry.

## 8. Representative quality fixture

A committed sample asset is **only a representative test fixture** for LazyDesigner/MCP workflow quality. It is not a product target and **must not create fixture-specific tool behavior**, schema, thresholds, workflow law, or acceptance rules. Another suitable fixture may replace it without changing production Runtime semantics.

Never mutate the approved fixture source for system testing. Use a disposable copy.

Visual/reference `PASS` still requires the approved reference plus fresh comparable model evidence. Static metrics or automatic similarity scores cannot create visual PASS.

## 9. Gateway Stability

Only when lifecycle proof is requested: use one continuous client task and prove offline→online recovery, AUTHORING↔Animation catalog handoff, plugin reload recovery, and close/open recovery without a new chat. Geometry↔Texturing remains shared AUTHORING. After `OUTCOME_UNKNOWN`, inspect state before retry.

## 10. Authoring Efficiency

After the quality gate passes, compare calls, discovery, capability-search misses, redundant readbacks, correction attempts, same-cause retries, recovery, handoffs and available elapsed cost.

```text
NECESSARY | AVOIDABLE | CONTRACT_CAUSED | REASONING_CAUSED | RECOVERY
IMPROVED | UNCHANGED | REGRESSED
```

Quality must stay accepted while Cost to Accepted Result decreases. Do not invent token/latency numbers.

## 11. Failure / Completion

Targeted quality work uses disposable face/contact, adjoining texture and limb-cycle fixtures under the current specialist gates. Keep rejected assets frozen. Native and user visual proof remain separate from source tests.

Classify the first wrong owner before correction. If a live verifier exposes a source defect, return only that defect to the appropriate development context; do not restart the entire GitHub audit.

Update only changed owners:
- `docs/05-operations/current-validation.md` — proof interpretation;
- `docs/05-operations/next-action.md` — continuation;
- `docs/04-system/implementation-map.md` — source ownership.

When requested proof criteria are satisfied, **STOP**.
