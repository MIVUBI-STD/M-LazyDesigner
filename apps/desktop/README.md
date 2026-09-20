# LazyDesigner Desktop

This directory owns the desktop **machine control plane** only.

## Responsibilities

- detect whether desktop Blockbench is running;
- discover the existing LazyDesigner managed installation;
- invoke the canonical managed `blockit.exe status` contract;
- present Gateway/Runtime/update health;
- supervise bounded user-requested lifecycle actions and safe self-healing;
- keep lightweight Runtime/Blockbench connection readiness current while Desktop is active without spawning the managed CLI on every heartbeat.

## Explicit non-ownership

Desktop does **not** own:

- Geometry, Texture, Animation, Particle authoring;
- Blockbench project state, Undo/Redo, viewport or export;
- MCP capability routing or Control context projection;
- release download, package verification, update staging, rollback journals, or Codex configuration rewriting.

Those remain owned by the existing Runtime/Gateway/Managed Distribution layers.

Desktop does not poll releases in the background and never kills Blockbench/Gateway processes. Safe self-healing is limited to restoring owned managed files while Blockbench/Runtime/Gateway are idle.


## Explicit maintenance actions

Desktop may invoke only bounded, named commands from the existing manager. The first mutating surface is:

```text
update
repair
recover
```

`Update` is an explicit user action and retains Managed Distribution staging, active-Gateway/Runtime guards, release verification and pending activation semantics.

`Recover` only invokes the existing interrupted-install recovery path. It is not presented as a generic repair operation.

`Repair` restores missing managed files from the currently active immutable package. It performs no release lookup and no version upgrade. Existing user-modified managed files remain fail-closed and are never silently overwritten.


## Blockbench compatibility projection

Desktop reads the canonical repository manifest at build time:

```text
mcp/compatibility/blockbench.json
```

It does not maintain a second version table. Runtime process detection and Windows executable metadata provide the installed Blockbench version; the Desktop projection then reports the same policy states used by the plugin compatibility boundary:

```text
validated
compatible-unverified
review-required
unsupported
invalid
```

A future Desktop change must update the canonical manifest rather than hard-code new Blockbench version ranges inside Rust or Svelte.


## Gateway lifecycle supervision

The managed Gateway is a persistent **stdio child owned by the MCP client/Codex session**. Desktop therefore does not launch, restart, terminate, or watchdog Gateway processes.

Desktop projects a bounded supervision state instead:

```text
healthy
waiting-runtime
client-disconnected
runtime-offline
idle
```

Recovery guidance follows ownership:

```text
Gateway active + Runtime offline
→ keep the Gateway session
→ restore/reload Blockbench Runtime

Runtime online + Gateway inactive
→ reconnect LazyDesigner MCP in the client

both inactive
→ start Blockbench
→ reconnect LazyDesigner MCP in the client
```

Do not add a Desktop `Start Gateway` or `Restart Gateway` command unless the MCP/client integration gains a real lifecycle-control contract. Starting `blockit.exe mcp` without a stdio client owner would create the wrong process model.


## Blockbench discovery and launch

Windows Blockbench installation is not assumed to live at a fixed path. The official NSIS configuration allows the installation directory to be changed, so Desktop uses this bounded discovery order:

```text
running Blockbench process executable
→ Windows uninstall registry entries with DisplayName=Blockbench
→ validated existing Blockbench.exe path
```

The visible `Open` action is explicit user intent, but it enters the canonical `ensure_ready` orchestration rather than invoking a second direct-launch path. Rust verifies managed/plugin readiness, launches Blockbench only when needed, waits for Runtime, and returns a bounded readiness outcome. The lower-level launcher remains an internal primitive only.

Version and compatibility projection now also work when Blockbench is installed but closed, provided Windows exposes a valid uninstall entry.


## Typed managed status and action availability

Desktop does not consume arbitrary manager JSON. The Rust boundary deserializes the canonical `blockit.exe status` schema into a typed projection and rejects unsupported schema values.

Maintenance availability is derived from that typed state:

```text
update
→ available whenever the managed installation is available
→ may stage while Gateway/Runtime is active

repair / recover
→ available only when Gateway and Runtime are inactive
→ UI disables the actions before invocation and shows the canonical safety reason
```

The manager remains the final authority and repeats its own safety checks; Desktop preflight is UX guidance, not a replacement security gate.


## Fresh-install bootstrap

Production Desktop bundles an exact-source managed package as a Tauri resource:

```text
resources/managed/
├── blockit.exe
├── blockit-package.json
├── blockit_mcp.js
└── canonical managed workspace/Skill/license payload
```

The resource is generated by the existing `mcp/distribution/package.ts` pipeline immediately before the Desktop bundle is built. It is generated output and is not committed.

When no managed installation exists, Desktop may expose `Install LazyDesigner`. Rust resolves the bundled resource through Tauri's resource path API and invokes:

```text
bundled blockit.exe install
→ --root <managed root>
→ --package <bundled managed package>
```

Desktop does not parse, reproduce, or weaken package verification/install/config semantics. The manager remains the only install engine.

The first native Blockbench plugin trust/load interaction remains a higher-context/native step when Blockbench requests it.


## Native Blockbench plugin handoff

Blockbench desktop stores plugin files under:

```text
app.getPath('userData')/plugins
```

and supports an advanced `--userData <path>` override. During first install Desktop resolves the active override when a running Blockbench command line exposes it; otherwise it uses the normal Windows Blockbench userData root.

Bootstrap therefore passes an explicit stable destination to the canonical manager:

```text
blockit.exe install
→ --plugin-path <Blockbench userData>/plugins/blockit_mcp.js
```

This does **not** edit Blockbench's `installed_plugins` state. Blockbench loads local-file plugins only after its native install/trust flow records them. Desktop exposes `Show plugin file` so the user can perform **Plugins → Load Plugin from File** once. After that, managed update/repair writes to the same remembered path.

Desktop must not edit Electron Local Storage/LevelDB to bypass Blockbench's native trust decision.


## Runtime security

Fresh managed installation provisions the machine-local HTTPS identity through the same compiled manager before activation. Desktop does not generate certificates itself.

Desktop projects:

```text
tls_ready
tls_error
```

and exposes **Setup Runtime Security** only when the manager reports that TLS is not ready and Gateway/Runtime are idle. The action delegates to `blockit.exe setup-tls`.

Update and package repair do not rotate or overwrite the TLS identity.


## Unknown-state policy

Desktop does not translate unavailable managed status into fabricated offline/stable state. If the manager exists but `blockit.exe status` fails, returns invalid JSON, or returns an unsupported schema:

```text
Gateway          → unknown
Runtime          → Unknown
Update state     → Unknown
Runtime Security → Unknown
maintenance      → disabled
```

The last known dashboard remains visible alongside the error so recovery context is not lost. The manager remains the final safety authority.

## Update naming

`blockit.exe update` updates managed Gateway/Runtime-plugin/Skills/distribution components. It does **not** replace the LazyDesigner Desktop executable. The Desktop UI therefore calls this **Update managed components**. Desktop self-update remains a separate release/signing concern and must not be implied by this action.


## Desktop release/version contract

Desktop application versioning is independent from managed-component update state.

Canonical version sources must stay equal:

```text
apps/desktop/package.json
apps/desktop/src-tauri/Cargo.toml
apps/desktop/src-tauri/tauri.conf.json
```

Release naming:

```text
desktop-vMAJOR.MINOR.PATCH
```

The repository provides a manual **Desktop Draft Release** workflow. It runs only from `main`, requires an explicit version that exactly matches all three source version owners, builds the exact-SHA integrated installer, verifies that the bundled managed package uses the same source SHA, writes SHA-256/provenance files, rejects duplicate release versions, and creates a **draft** GitHub Release only.

The workflow does not publish automatically and does not implement Desktop self-update. `Update managed components` remains a separate Managed Distribution action. Any future Desktop self-update requires its own signed update-channel design and must not be inferred from the draft-release workflow.


## Desktop hardening contract

Desktop command failures cross the Tauri boundary as a stable structured error object:

```text
code
message
recoverable
```

The frontend must not parse human error prose to decide control flow.

External inspection/manager subprocesses are bounded. Status/discovery probes use short timeouts; explicit install/update/repair/recover actions use longer bounded timeouts. A stalled child must be terminated rather than leaving the Desktop UI busy indefinitely.

Desktop may export an explicit local diagnostic snapshot. The snapshot contains only projected health/version/compatibility state and Desktop platform/version metadata. It does not copy TLS private keys, certificates, project content, environment variables, Codex configuration, or arbitrary logs. Diagnostic export is user-initiated and local-only.


## Canonical readiness and session operations

Readiness and the canonical Desktop `product_state` are projected in Rust and shipped as part of `SystemStatus`; Svelte maps that state to presentation instead of reconstructing machine-state policy independently. Each status snapshot carries an observation timestamp so exported diagnostics and UI state can be distinguished from stale screenshots.

Desktop keeps only a bounded in-memory list of recent explicit actions for the current UI session. It records action name, success/failure, canonical receipt/error code, and display time. This is intentionally not a persistent operation database and it does not replace Managed Distribution receipts or Git history.


## Managed rollback and progress projection

Desktop does not infer rollback from version folders. Managed Distribution status is the authority for whether the latest committed managed transition has a verified previous `installed.json` backup. Desktop exposes rollback only when that projection says it is available and the normal idle mutation gate is satisfied.

Long-running managed actions invoke the manager with `--progress-json`. Progress events are structured JSON lines emitted by the manager and relayed through a Tauri event. The UI never invents percentages or stages. Final success/failure still comes from the canonical manager receipt and exit status.


## Desktop release trust boundary

Development drafts and trusted release drafts are deliberately separate modes.

A **development draft** may be built without publisher credentials, but the release notes mark it as non-publishable. A **trusted draft** requires two independent trust layers:

```text
Windows Authenticode
→ identifies the Windows installer publisher

Tauri updater signature
→ signs the updater artifact with TAURI_SIGNING_PRIVATE_KEY
```

Trusted builds use `src-tauri/tauri.release.conf.json`. Tauri delegates Windows signing to the repository-owned `scripts/sign-windows.ps1`, which accepts only the certificate thumbprint imported for the current release job and a configured HTTPS timestamp URL. The release workflow verifies the final NSIS installer with `Get-AuthenticodeSignature` and refuses trusted output unless the status is `Valid`.

The Windows PFX bytes/password and Tauri updater private key/password are release secrets and never repository files. The imported Windows certificate is removed from the runner store during workflow cleanup.

Generating signed updater artifacts does **not** enable Desktop self-update. Runtime updater support remains disabled until an intentional change commits the trusted public updater key, HTTPS endpoint/channel policy, updater plugin dependency/lockfiles, and explicit user-facing update behavior.


## Static trusted update manifest

Trusted draft releases also produce `latest.json` using the canonical non-secret policy in `release-channel.json`. The manifest contains the exact Desktop SemVer plus the Windows x86_64 release asset URL and the contents of the Tauri `.sig` sidecar.

The stable manifest endpoint is reserved as:

```text
https://github.com/MIVUBI-STD/M-LazyDesigner/releases/latest/download/latest.json
```

This is release infrastructure only. `release-channel.json` keeps `selfUpdateRuntimeEnabled` false, and the Desktop contains no updater plugin or embedded updater public key yet. Enabling runtime update checks remains a separate change with its own lockfile/config/security review.

Development and trusted drafts also use separate tag namespaces:

```text
development draft → desktop-dev-vMAJOR.MINOR.PATCH-<source-sha-prefix>  (prerelease)
trusted draft     → desktop-vMAJOR.MINOR.PATCH
```

An unsigned development artifact therefore cannot reserve or masquerade as the final trusted release tag.


## Workstation automation and first-run policy

Normal operation is intent-driven rather than launch-driven:

```text
Desktop opens
→ health/readiness observation only
→ safe repair may restore a missing owned plugin while Blockbench is closed
→ Desktop does not launch Blockbench automatically

user chooses Set up / Prepare Blockbench / Open
→ backend ensure_ready owns orchestration
→ repair missing owned plugin when safe
→ launch Blockbench if needed
→ wait for Runtime
→ report READY / RUNTIME_READY / APPROVAL_REQUIRED / NEEDS_ATTENTION
```

The first native local-plugin trust decision remains Blockbench-owned. Desktop may conclude that one-time approval is likely only when Blockbench is running, the managed plugin file is integrity-valid, and Runtime remains unavailable after the bounded readiness grace period. Timeout alone is not treated as proof of approval state.

Frontend development builds support deterministic UI state fixtures through:

```text
?fixture=ready
?fixture=fresh-install
?fixture=approval-required
?fixture=plugin-missing
?fixture=plugin-modified
?fixture=runtime-offline
?fixture=client-wait
?fixture=unsupported
?fixture=repair-blocked
```

Fixtures are a development-only presentation overlay. They do not alter machine state and are disabled from connection watching while active.

## Blockbench profile ambiguity

A running Blockbench process without `--userData` resolves to the normal Windows Blockbench userData directory. A running process with an absolute `--userData` resolves to that profile.

When multiple Blockbench processes are running, Desktop accepts setup only when all observed processes resolve to the same userData directory. Different simultaneous profiles are fail-closed because there is no safe single plugin destination. Desktop asks the user to close the extra Blockbench profile instead of guessing.

## Lightweight connection watcher

The active-window heartbeat is deliberately cheaper than full `system_status`. It observes only rapidly changing local state:

```text
Blockbench process
managed plugin integrity
profile-bound Runtime session lease
active Gateway lease
project navigation generation/lease
```

The Runtime session lease is created only after RuntimeHost successfully binds its HTTPS listener and is removed by its owning Runtime generation during teardown. It contains a bounded profile identity, producer PID, Runtime instance identity, and canonical loopback Runtime URL. A short heartbeat makes a crashed or abandoned producer expire without relying on a hardcoded port probe.

Full `system_status` compares the live listener URL with the canonical Runtime URL projected by Managed Distribution from the MCP client configuration. Runtime is ready only when the profile-bound listener lease is live, the configured endpoint is reachable, and both URLs match. An unrelated process occupying port 3000 therefore cannot make Desktop report Runtime ready, and custom ports remain valid when Blockbench and the MCP client are configured consistently.

The heartbeat uses process/filesystem inspection directly in Rust. It does not spawn `blockit.exe status` every few seconds. Gateway uncertainty preserves the last known full Rust projection rather than translating uncertainty into offline.

When a known fast-probe value changes, Desktop performs one full `system_status` refresh so compatibility, maintenance availability, Gateway supervision, readiness, Runtime endpoint agreement, and `product_state` are re-projected by their owning layers.

## Projects & Models navigation

Desktop provides a compact filesystem-navigation layer without becoming a second project database or file manager.

Blockbench remains the authority for the active model and recent saved models. The managed Blockbench Plugin writes a bounded local projection scoped to the Blockbench userData profile where that managed plugin is installed:

```text
%LOCALAPPDATA%\LazyDesigner\project-navigation\<profile-id>.json
```

The profile ID is a deterministic hash of the normalized Blockbench userData path. The raw profile path is not exposed in the normal Desktop projection. A Plugin running under another userData profile writes a different file and cannot replace the managed profile's navigation snapshot.

The projection contains bounded active/open/recent `.bbmodel` navigation state plus opaque producer/profile identity needed to determine freshness and ownership. It is a cache/projection, not authored project state. Desktop does not edit Blockbench local storage to obtain recents.

Desktop converts the raw model paths into a path-free UI projection:

```text
Active Project
→ active model

Recent Projects
→ grouped saved .bbmodel files

See details
→ models inside the selected project
```

Project grouping is deterministic and intentionally shallow:

```text
nearest .lazydesigner-project.json marker within the bounded parent search
→ otherwise parent of Models/Model
→ otherwise direct parent folder
```

This supports one project such as `Furniture` containing multiple `.bbmodel` files without requiring a global project database. Paths stay hidden in the normal UI. Backend actions resolve opaque project/model IDs back through the current local projection before opening Explorer or Blockbench.

Normal UI actions are bounded to:

```text
Open Folder
Open model in Blockbench
Reveal model file
Copy path
```

`See details` may additionally expose existing working folders from a small allowlist only:

```text
Models
References
Textures
Exports
```

These shortcuts appear only when the corresponding directory actually exists under the resolved Project root. Desktop does not recursively scan for similarly named folders and does not surface these shortcuts in the normal Overview row.

Opening a model from Desktop first passes through the canonical `ensure_ready` flow; project navigation does not create a second Blockbench lifecycle path. Missing files remain visible as unavailable rather than triggering a drive scan or guessed relocation.

The active-window heartbeat watches the canonical navigation token emitted by the Blockbench plugin. The token is `<profile-id>:<producer-generation>:<revision>`, so profile changes and plugin module reloads cannot accidentally reuse the same apparent revision number. Desktop also watches a separate session-live projection derived from the Blockbench process plus a bounded plugin lease; Runtime reconnects do not invalidate project-session state by themselves.

The plugin refreshes that lease every 10 seconds by touching snapshot metadata rather than rewriting the JSON payload. Desktop treats the lease as stale after 30 seconds. A stale or absent lease clears ephemeral `Active`, `Open`, and `Modified` state, while recent saved navigation remains available. When either the navigation token or session-live state changes, Desktop performs one normal status refresh; it does not crawl project folders continuously.

The plugin projection also carries the bounded saved/open model inventory needed for navigation:

```text
active model
open saved models
dirty/clean state
recent saved models
```

Desktop uses that state only where it changes a user decision. An already-open model is presented with `Switch`; a dirty model is marked `Modified`. Other editor-session details stay hidden. Opening an existing `.bbmodel` still goes through Blockbench's normal native file-open path, whose existing-tab guard selects the already-open project instead of creating a duplicate tab.

Open/dirty/active are ephemeral Blockbench-session state. Desktop discards those flags whenever the bounded Plugin session lease is not live, while recent saved models remain available for navigation. Runtime reconnects do not invalidate a still-live Blockbench Plugin session. A stale snapshot therefore cannot keep rendering `Switch` or `Modified` after Blockbench closes.

Pinned Projects are a Desktop navigation preference only. Desktop stores only deterministic opaque project IDs in `%LOCALAPPDATA%\LazyDesigner\project-preferences.json`; it does not copy project paths, model contents, or Blockbench authored state into that preference file. Pinning changes Recent Projects ordering only.

## Bounded local operation log

Desktop writes a minimal best-effort machine log under its LocalAppData directory. Entries contain only:

```text
timestamp
bounded action token
bounded outcome token
```

The active file is capped at 512 KiB and rotates to one previous file. Readiness outcomes use bounded tokens such as `READY`, `RUNTIME_READY`, `APPROVAL_REQUIRED`, or a bounded reason token for `NEEDS_ATTENTION`; managed actions prefer the canonical receipt status. It does not record project content, file paths, environment values, command output, TLS material, Codex configuration, or arbitrary error prose. Diagnostic export does not automatically attach this log.

This log is operational evidence only. Managed Distribution receipts remain authoritative for install/update/repair transitions.

## Uninstall and ownership contract

Desktop uninstall and LazyDesigner integration cleanup are separate ownership decisions.

Current safety contract:

- NSIS uninstall removes the Desktop application itself.
- It must not silently delete the user's BlockIT workspace or authored assets.
- Managed Distribution remains owner of managed Gateway/Runtime/Skill files and transaction state.
- The Blockbench plugin is managed content and must not be removed by blindly deleting the entire Blockbench plugin directory.
- Desktop must not edit Blockbench Local Storage/LevelDB to revoke plugin trust.
- A future explicit **Remove LazyDesigner integration** action may delete only files proven owned by the current managed installation, after Runtime/Gateway are idle, while preserving user workspace by default.
- Until that explicit cleanup contract exists, uninstall is conservative rather than destructive.

Do not add uninstall cleanup directly to NSIS before the manager exposes a bounded ownership-aware removal command.
