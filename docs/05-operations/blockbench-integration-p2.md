# P2 — Native model-open acknowledgment and acceptance matrix

This is a **source implementation**, not a claim of tested live Blockbench acceptance.
The Desktop requester and the existing Blockbench plugin navigation producer
are kept separate: the producer remains authoritative for what is actually
active, not for which subprocess Desktop successfully spawned.

## Model-open result contract

- `CONFIRMED_ACTIVE` — within a bounded 4-second, user-initiated observation,
  a *new* schema 4 project snapshot written on/after the launch request is
  linked to the exact pinned userData profile, a currently running Blockbench
  executable PID, the exact requested saved .bbmodel path, and consistent
  active/open project UUID. This proves the native plugin observed an active
  model; it is **not** a persistence/visual/Undo acceptance result.
- `LAUNCHED_UNVERIFIED` — Windows accepted the executable launch but there is
  no qualifying native observation. Missing plugin/permissions, startup delay,
  no event, unsupported profile, another active tab, timeout or stale snapshot
  are not silently converted into a success claim.
- `CANCELLED` — user cancelled the file chooser; no editor launch.

No ambient polling, no new IPC listener, no project-file rewrite, and no
additional Blockbench plugin registration. The existing snapshot schema remains
4 with an **additive** `producer_pid` field. Older snapshot writers are accepted
for ordinary navigation but not as verified model-open evidence.

## Required exact-SHA Windows acceptance

1. Run `apps/desktop`: `npm ci` then `npm run verify:source`.
2. On the same exact SHA run the existing `Desktop Verify` and `MCP Verify`
   Windows workflows. Ensure Native Blockbench validation is distinct from
   headless CI (CI is not proof that an editor tab loaded).
3. Launch a disposable Blockbench profile with the matching plugin build. Use
   two distinct saved model paths with the same basename; only the requested
   exact path may qualify.
4. Open a saved model from a registered Project while another saved model
   is active; require `CONFIRMED_ACTIVE` only after native snapshot changes
   and the requested project is visibly active.
5. Open via `Open Model…`. Verify the UI distinguishes `CONFIRMED_ACTIVE`
   from `LAUNCHED_UNVERIFIED`.
6. Close native plugin / deny scoped FS permission / delay model load / quit
   Blockbench after spawning. Require `LAUNCHED_UNVERIFIED`, never false success.
7. Run a second Blockbench instance with a different userData profile and
   inject an old snapshot. It must never authenticate the requested target.
8. Save As, move the model, reopen, and verify exact requested path as well as
   file bytes, native Undo/Redo and active tab. No project file is modified by
   the verifier itself.
9. Repeat on the next Blockbench patch and feature release. Never infer native
   acceptance solely from a version string or healthy MCP port.
10. Capture editor version, profile identity, PID, installed source SHA,
    plugin build identity, model path, observed receipt and negative-case logs.

## Explicit limitations

- This does not force a model to load or repair its path.
- Non-Windows/missing Blockbench PID proof returns unverified.
- Desktop does not automatically adopt another profile or follow a portable
  self-extracting launcher.
- No claim of native PASS until Windows smoke, exact native bundle acceptance,
  and save/reopen evidence are recorded.
