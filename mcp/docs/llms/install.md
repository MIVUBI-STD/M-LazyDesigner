## Install LazyDesigner Locally

LazyDesigner must be validated from this repository's **`Local` branch**. Do **not** use an upstream hosted Blockbench MCP plugin as proof of LazyDesigner; it is a different product/artifact surface.

Build the local plugin from `mcp/`:

```bash
bun install --frozen-lockfile
bun run setup:tls
bun run typecheck
bun run test
bun run build
bun run docs:check
```

Load the generated compatibility bundle in desktop Blockbench:

```text
mcp/dist/blockit_mcp.js
```

`blockit_mcp.js` is a retained compatibility filename, not the current product name.

Native Blockbench Runtime HTTPS endpoint after the plugin is running (diagnostics only):

```text
https://127.0.0.1:3000/bb-mcp
```

It requires the machine-local TLS certificate and Runtime authorization credential. Do not point Codex directly at this native endpoint. Codex uses the persistent four-tool stdio Gateway; select a source-checkout or exact-SHA managed Gateway as described in the [local acceptance runbook](../../../docs/05-operations/local-acceptance-runbook.md#3a-choose-the-codex-mcp-gateway-to-test).

Keep **Legacy UI Fallbacks (Debug)** disabled for normal Bedrock Entity authoring. `risky_eval` and `from_geo_json` remain disabled.

For the current repository acceptance procedure, follow root `docs/05-operations/next-action.md` and `docs/05-operations/local-acceptance-runbook.md`. This install fragment only owns local build/load guidance; it does not replace repository task routing.
