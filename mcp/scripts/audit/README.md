# Audit Scripts

Static repository/capability audits live here. Scripts consume canonical source
ownership and must not own Runtime behavior.

## REA: direct external investigation, not another LazyDesigner engine

Use the upstream [REA CLI](https://github.com/morluto/rea) directly. The retired
`audit:rea` wrapper duplicated REA's Evidence contract and process lifecycle;
its locally invented projection could never authenticate the original Evidence.
There is no REA Runtime, public Gateway tool, second data model, or installed
REA dependency in LazyDesigner.

### Select the authority before calling REA

| Target | Appropriate REA investigation | What it cannot prove |
| --- | --- | --- |
| Installed Blockbench Electron ASAR | Static editor/JavaScript/Electron boundaries | LazyDesigner plugin behavior unless its exact bytes are included |
| Actual LazyDesigner JavaScript/TypeScript source directory | Static artifact/module structure from those sources | Compiled build, Gateway/Runtime behavior, or user-accepted model quality |
| Desktop Tauri executable | Separate authorized native-provider investigation when supported | Native Rust semantics through a JavaScript/Electron analyzer |
| Running Blockbench with LazyDesigner loaded | Independently authorized runtime observation and own-session tests | Runtime PASS from a static graph |

REA's [JavaScript artifact analysis](https://github.com/morluto/rea/blob/main/docs/javascript-artifact-reconstruction.md)
accepts an exact absolute JavaScript directory or Electron ASAR. Example, with
a trusted, separately installed `rea` command and an operator-selected target:

```sh
rea analyze-javascript-application /absolute/path/to/selected/app.asar --integrity-policy fail --json > /outside/checkout/rea-static-evidence.json
```

Do not execute an untrusted artifact to obtain static results. Record the
selected target type, exact bytes/digest, REA version, environment, full
`Evidence`, `normalized_result.graph.coverage`, semantic coverage,
limitations, integrity contradictions, source selection, and residual unknowns.
A successful exit or complete static graph **is not** native Blockbench,
visual-fidelity, or source-CI acceptance. Compare only observations with
compatible target identity and authority.

For runtime questions, use REA's [runtime reconciliation](https://github.com/morluto/rea/blob/main/docs/javascript-runtime-reconciliation.md)
or [process capture](https://github.com/morluto/rea/blob/main/docs/process-capture.md)
with explicit permission and owned cleanup, then verify actual LazyDesigner
Gateway/Blockbench effects in the existing
[`LIVE_BLOCKBENCH` runbook](../../../docs/05-operations/local-acceptance-runbook.md).

**Status:** Direct REA commands, installation, analyzed artifacts and native
Blockbench scenarios have **NOT EXECUTED** in this repository-development
session. No static reference or synthetic fixture substitutes for them.
