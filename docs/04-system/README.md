# 04 — System

Owns LazyDesigner system architecture details that are neither product policy nor asset-authoring policy.

```text
ai-context-loading.md
authoring-stage-context.md
tool-execution-paths.md
tool-efficiency-audit.md
tool-capability-integrity-audit.md
blockbench-compatibility.md
control/context-projection.md
implementation-map.md
skill-taxonomy.md
compatibility-identifiers.md
```

## Read order by question

```text
What should the AI load for this task?
→ ai-context-loading.md

Which cross-stage context rules are shared without creating another Skill/router?
→ authoring-stage-context.md

Does a Tool act through direct/native Blockbench state or UI automation?
→ tool-execution-paths.md

Which Tools still create avoidable public choice, calls or implicit-state overhead?
→ tool-efficiency-audit.md

Did historical cleanup/compaction remove meaningful Tool capability or intelligence?
→ tool-capability-integrity-audit.md

Which Blockbench versions are validated, merely allowed, or review-gated?
→ blockbench-compatibility.md

What does Control project to Codex?
→ control/context-projection.md

Which source/module owns this behavior?
→ implementation-map.md

Which Skill category/semantic owner applies?
→ skill-taxonomy.md

Which legacy BlockIT identifier must remain stable during migration?
→ compatibility-identifiers.md
```

AI load rule: use this domain for context loading, shared Stage Context, Tool execution-path/efficiency/integrity questions, Blockbench compatibility, Control/context routing, source ownership, Skill ownership, or compatibility-identifier questions. Do not use it as a substitute for product flow or authoring standards.
