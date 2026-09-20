# BlockIT Managed Distribution

The managed distribution installs a verified BlockIT Gateway executable, Blockbench plugin bundle, canonical authoring Skills/instructions, foundation references, workspace conventions, license/notices, and the BlockIT portion of Codex MCP configuration.

It does not own user assets and does not create model history.

## Managed layout

```text
.blockit/
├─ versions/<source-sha>/blockit.exe
├─ plugin/blockit_mcp.js
├─ installed.json
├─ pending.json              # only when activation is deferred
└─ transactions/

Authoring workspace
├─ AGENTS.md
├─ .agents/skills/**
├─ docs/foundation/09-finalization-standard.md
└─ workspace/README.md
```

User assets remain under `workspace/active` or user-owned locations and never become application rollback payload.

## Source / Runtime authority

The package is built from one exact source SHA and records file hashes plus Runtime `build_identity`. Normal Codex launch points at the versioned Gateway executable; Blockbench loads the managed `blockit_mcp.js`.

BlockIT now has one native Geometry authoring path. Retired 3D-assisted/Hunyuan/PrimitiveAnything tooling is not part of the managed package or authoring contract.

## Safe activation and recovery

Updates are explicit, not network polling during authoring. The package is downloaded/built and verified before activation. Active Gateway process leases or a responding Runtime postpone replacement. A pending update may activate only when no conflicting Gateway/Runtime is active.


Desktop startup discovery uses the read-only `check-update` command. Published managed releases contain a separate digest-verified `blockit-package.json` asset so availability can be determined without downloading the full Windows ZIP. The command compares its authoritative `source_sha` with the installed source SHA and returns only `UP_TO_DATE`, `UPDATE_AVAILABLE`, `UPDATE_STAGED`, or `NOT_INSTALLED`.

`check-update` never stages or activates files. Network lookup is bounded and happens only when explicitly invoked by the Desktop startup owner; it is not called by normal MCP launch or the Desktop connection heartbeat.

The manager never kills applications, closes unsaved models, silently overwrites user-edited managed Skills, or mutates user assets. Transaction journals and hashes protect install/update/rollback. Local modifications require explicit adoption where supported.

## Codex configuration

Only the BlockIT MCP entry is managed. Other servers, model/settings semantics, comments, timeouts, disabled/remote entries, and unrelated configuration remain preserved or fail closed when safe preservation cannot be proven.

Normal MCP launch uses the installed versioned Gateway executable directly. The maintenance command wrapper exists for explicit install/update/status/recovery operations; it is not the normal authoring transport.

## Package verification

A valid package must match repository identity, source SHA, build identity, platform, required file inventory, byte sizes and SHA-256 hashes. Path traversal, linked destination components, incomplete payloads, duplicate entries and stale concurrent writes fail closed.

Generated/runtime/static verification does not establish live Blockbench visual or native authoring acceptance.


## Desktop control-plane contract

The planned LazyDesigner Desktop application must reuse this managed distribution rather than implement a second updater, rollback engine, release downloader, Codex configuration writer, or Gateway package manager.

Its machine-facing read contract is:

```text
blockit.exe status
→ schema
→ installed
→ pending
→ gateway_active
→ runtime_online
```

The Desktop Rust layer may supervise processes, invoke explicit maintenance commands, detect Blockbench, present diagnostics, and coordinate user-facing lifecycle actions. Update/install/recover/rollback semantics remain owned here.

The Desktop application must not poll release endpoints during authoring. Existing explicit update semantics, active Gateway leases, Runtime reachability checks, staging, transaction journals, integrity verification, and rollback stay authoritative.


## Repair semantics

`repair` is distinct from update and recovery:

```text
active installed source SHA
→ verify the immutable package for that same SHA
→ restore missing managed targets only as needed
→ preserve the active source SHA
→ no release lookup
→ no upgrade
```

A non-missing managed file whose bytes no longer match the previously owned hash remains a local modification and blocks repair. Repair does not use `--adopt` and does not silently overwrite user edits.

Repair is refused while a Gateway session or Runtime is active, matching the existing mutation-safety boundary.


## Runtime TLS machine identity

Managed Distribution owns the machine-local HTTPS identity required by both the Blockbench Runtime and Gateway client.

```text
distribution/runtime-tls.ts
→ inspect / provision / validate one machine identity

scripts/setup-runtime-tls.ts
→ compatibility wrapper only

first install
→ verifies the managed package
→ provisions TLS once when no installation exists
→ never overwrites an existing cert/key pair

setup-tls
→ explicit recovery/setup action
→ refuses incomplete or invalid existing pairs instead of silently replacing them

status
→ tls_ready
→ tls_error
```

The certificate remains outside package transactions at the canonical machine path from `runtimeTlsPaths()`. Update and package repair never rotate the identity.


## Runtime TLS renewal

Fresh install continues to use no-overwrite TLS provisioning. Existing valid machine identities are retained.

The explicit `setup-tls` maintenance command is the only path allowed to renew a complete but invalid/expired pair. It requires an installed managed state and is refused while a Gateway session or Runtime is active. Renewal keeps the previous pair in memory during replacement and restores its bytes if new provisioning fails.

An incomplete one-file identity remains fail-closed and is never guessed or silently replaced.


## Read-only rollback projection and progress events

`status` exposes a read-only rollback projection derived from the current transaction journal:

```text
rollback.available
rollback.previous_source_sha
rollback.transaction
```

Rollback is reported available only when the current transaction is committed, contains a valid backed-up prior `installed.json`, and that backup identifies a valid previous source SHA. Version-directory presence alone never authorizes rollback.

Maintenance commands accept optional `--progress-json`. When enabled, the manager emits newline-delimited JSON progress events to stderr while preserving the existing final JSON receipt on stdout. Stages are descriptive only; no fake percentage is emitted. Callers must continue to treat the final exit status and receipt as authoritative.
