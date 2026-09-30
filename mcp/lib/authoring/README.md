# Authoring Domain

Owns durable authoring lifecycle truth that is independent of recipe mechanics and execution scheduling.

```text
asset health
readiness / handoff gates
validation verdicts
semantic history
semantic scope / dependency summaries
```

This domain answers **what the current authored state means**.

It must not depend on `authoringRecipe/`, `orchestration/`, Gateway, or Runtime executors. If a concern requires recipe compilation or execution sequencing, it belongs elsewhere.
