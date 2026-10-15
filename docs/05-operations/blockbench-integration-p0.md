# Blockbench integration P0 — strict installation and profile binding

Source baseline: `fd4301e588b7ff9bf2e37cb62f5fbe39abe8a661` on `Local`.

This phase changes **editor selection and status receipts only**. No change to .bbmodel, Project manifests, Blockbench Undo/Redo, asset paths, managed package layouts, the Gateway, or the user's file contents.

## Invariants

1. A managed LazyDesigner installation pins the Blockbench userData path holding its plugin. A running editor with another profile is not borrowed.
2. Multiple running Blockbench executable paths, or multiple valid installed executable candidates while Blockbench is closed, are **ambiguous**, not an opportunity to choose the first.
3. Explicit editor selection is stored in bounded, versioned, Desktop-owned metadata and never writes into Blockbench's own profile or managed install state.
4. A model Open request returning `LAUNCHED` means the OS accepted process creation. It is **not** proof of file load, the selected editor tab, or foreground focus.
5. AI readiness uses the same bound editor launcher as normal Open. AI and managed Runtime health are not a prerequisite for user-initiated editor-only Open and Open Model.
6. Existing managed install pinning and recover/rollback behavior must remain unchanged.

## Windows acceptance matrix (not yet executed by this source change)

- Managed profile and running editor match: Open and Open Model launch without profile conflict.
- Managed profile and running editor differ: fail with a specific profile diagnostic; do not launch another editor and do not touch model files.
- Multiple running `Blockbench.exe` executable paths: reject; do not select the first PID.
- Multiple installed valid Blockbench executables with editor closed: reject automatic selection, then choose Blockbench.exe explicitly in Support. Retry Open.
- Move a selected Blockbench.exe: detect stale selection, choose the replacement in Support, verify editor metadata, then retry.
- Select an official versioned `Blockbench_X.Y.Z_portable.exe` launcher: reject with a clear diagnostic because its extracted child executable has different identity. No plugin/profile/model file changes; portable launcher support requires separate live acceptance.
- One valid editor, zero running: launch with exact managed userData.
- No managed install, one valid editor: regular Open Model works independently of AI readiness.
- Registered folder model and snapshot/recent model: return `LAUNCHED`, never a false `OPENED` receipt.
- Manual UI confirmation: verify the intended .bbmodel opens in the correct Blockbench profile, including Save As, closed editor, and an already-open editor.
- Check update/repair/rollback behavior after the changes; verify no existing project or plugin is overwritten.
- Execute exact-head Windows Desktop Verify and LIVE_BLOCKBENCH acceptance before declaring native PASS.

## Remaining planned work

- Native acknowledgment that the requested path became the active loaded Blockbench model (rather than relying on a process or window focus receipt).
- Guided userData profile migration remains future work; manually selecting another editor executable does not change or migrate its plugin profile.
- Capability-based adaptation for future Blockbench API changes, separate from this identity/path P0.
