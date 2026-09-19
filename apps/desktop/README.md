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
