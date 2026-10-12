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

The script calls `rea analyze-javascript-application ... --integrity-policy fail --json`, streams complete REA JSON to a private temporary file, validates the basic Evidence envelope and emits only a bounded summary. It does **not** execute the inspected application. To retain REA's complete original Evidence, supply an absolute output path **outside the checkout**. Existing output is never overwritten, temporary files are deleted, and retained Evidence must be handled as sensitive (it can contain absolute paths, strings and source data). REA's own Evidence ID is only shape-checked here; **the REA engine remains the authority** for full authenticity and graph integrity.

`application_graph_coverage=complete` means only a reported static analysis property. Partial or unreported coverage remains unresolved, and the script always reports native Blockbench, runtime behavior, source acceptance and visual fidelity as unverified/not evaluated. For runtime observation, process correlation, or reconstruction obligations use REA's independently authorized workflows and compare their own Evidence records; this script does not turn static evidence into runtime proof. A Tauri application is **not** an Electron application. Never claim this static command has reverse-engineered the Tauri native layer.

REA binary setup and a real target are not provided by repository CI. Unit tests validate the projection boundary only; no REA executable or installed editor was exercised by them.
