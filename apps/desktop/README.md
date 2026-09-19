# LazyDesigner Desktop

This directory owns the desktop **machine control plane** only.

## Responsibilities

- detect whether desktop Blockbench is running;
- discover the existing LazyDesigner managed installation;
- invoke the canonical managed `blockit.exe status` contract;
- present Gateway/Runtime/update health;
- later supervise explicit user-requested lifecycle actions.

## Explicit non-ownership

Desktop does **not** own:

- Geometry, Texture, Animation, Particle authoring;
- Blockbench project state, Undo/Redo, viewport or export;
- MCP capability routing or Control context projection;
- release download, package verification, update staging, rollback journals, or Codex configuration rewriting.

Those remain owned by the existing Runtime/Gateway/Managed Distribution layers.

The first source surface is intentionally read-only. It does not poll releases in the background and does not kill Blockbench/Gateway processes.


## Explicit maintenance actions

Desktop may invoke only bounded, named commands from the existing manager. The first mutating surface is:

```text
update
recover
```

`Update` is an explicit user action and retains Managed Distribution staging, active-Gateway/Runtime guards, release verification and pending activation semantics.

`Recover` only invokes the existing interrupted-install recovery path. It is not presented as a generic repair operation.

A separate `Repair` action must not be added until the managed distribution has a distinct repair semantic; repair must never be an alias for upgrade.


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
