# Audit Scripts

Static repository/capability audits live here. Audit scripts consume canonical source ownership and must not own Runtime behavior.

## Optional REA static artifact audit

REA is an **optional development investigation dependency**, not an authoring engine, build dependency, Gateway tool, automatic CI step or native Blockbench validator.

After a trusted, separate REA installation has been verified, inspect an explicitly selected **built JavaScript directory or packaged Electron `.asar`** (for example, the installed Blockbench Electron app):

```sh
cd mcp
bun run audit:rea -- /absolute/path/to/app.asar
bun run audit:rea -- /absolute/path/to/app.asar --retain-evidence /outside/repo/rea-evidence.json
```

The script calls `rea analyze-javascript-application ... --integrity-policy fail --json`, writes full CLI JSON into a private temporary file, then projects a bounded **source-reported** summary. The projection checks `normalized_result.graph.coverage.status`, `semantic_graph.coverage.status`, subject/graph bindings, omitted sources, semantic unknowns, parser failures and integrity contradictions. These format/consistency checks do **not** cryptographically authenticate the Evidence ID or prove execution. It does **not** execute the inspected application. To retain REA's complete original Evidence, supply an absolute output path **outside the checkout**. Existing output is never overwritten, temporary files are deleted, and retained Evidence must be handled as sensitive (it can contain absolute paths, strings and source data). REA's own Evidence ID is only shape-checked here; **the REA engine remains the authority** for full authenticity and graph integrity.

`application_graph_coverage=complete` means only reported static coverage. Even `REPORTED_COMPLETE_STATIC_ONLY` is not a LazyDesigner acceptance verdict. Partial or unreported coverage remains unresolved, and the script always reports native Blockbench, runtime behavior, source acceptance and visual fidelity as unverified/not evaluated. For runtime observation, process correlation, or reconstruction obligations use REA's independently authorized workflows and compare their own Evidence records; this script does not turn static evidence into runtime proof. A Tauri application is **not** an Electron application. Never claim this static command has reverse-engineered the Tauri native layer.

REA binary setup and a real target are not provided by repository CI. The synthetic fixture tests cover only the projector's contract boundary; they do not authenticate REA Evidence or exercise its real CLI. REA/Blockbench execution is NOT EXECUTED. The convenience wrapper limits retained raw JSON to 64 MiB; larger investigations should use the original REA workflow.
