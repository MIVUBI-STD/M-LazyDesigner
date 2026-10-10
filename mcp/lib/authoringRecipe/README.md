# Authoring Recipe Domain

Owns declarative, deterministic recipe semantics for parametric authoring.

```text
recipe contracts
compile / rewrite
semantic edit / identity
incremental rebuild
native-state comparison
plan/apply transaction
recipe persistence
pure planning
stateful recipe service
```

This domain answers **what should be authored and how a recipe changes**.

`planning.ts` owns pure planning APIs. `service.ts` owns bounded stateful plan/apply/identity/evidence lifecycle and may compose recipe modules, but recipe source must not depend on Gateway or Runtime executors.

Recipe code must not depend on `orchestration/`. Orchestration may consume recipe outputs.

## Native Undo and pre-commit boundary

`transaction.ts` owns the parametric recipe's atomic apply contract.
The single Blockbench owner is
`mcp/server/runtime/recipes/authoring/runtime.ts`:

1. read exact owned native snapshot/fingerprint and compile affected instances;
2. open native `Undo.initEdit` for affected existing Cubes + outliner;
3. mutate only owned instances and validate the compiled post-state;
   save the pre-edit *existing* Cubes and the post-edit *surviving updated +
   created* Cubes, omitting deleted Cubes from post-save. Capture outliner in
   both directions: Blockbench 5.2.1 `UndoSystem.save.load` removes elements
   missing from the opposite snapshot, so asymmetrical tracking can damage
   Undo/Redo of modified/deleted geometry;
4. invoke the existing adapter's **read-only** `verifyBeforeCommit` while its
   exact Undo save is still active, then re-read/fingerprint the native state;
5. construct a receipt before `Undo.finishEdit`, which is the last stateful
   action; no verification work may follow a successful commit.

If an in-flight check fails, the native owner cancels **its own**
`Undo.current_save` with `Undo.cancelEdit(true)`. The transaction then
reads back the exact pre-apply snapshot fingerprint. A mismatch or lost Undo
ownership returns `RECIPE_APPLY_ROLLBACK_UNVERIFIED`, never a success receipt.
Do not use an unscoped `Undo.undo()`: a subsequent edit could belong to
someone else.

## Exact-last-edit recovery after commit

The existing `applyCompact` evidence receipt may carry short-lived
`native_undo_provenance` from the genuine Blockbench Undo transaction.
The native owner stamps a private Symbol on **Undo.current_save before**
`Undo.finishEdit`; Blockbench 5.2.1 stores this exact save object in
`Undo.history[index].before`. This does not create another history or
an auxiliary registry. A fake/source-only adapter returns no such proof
and therefore cannot authorize post-commit rollback.

The existing `AuthoringRecipeService.revertApplied` accepts only an
`APPLY_RECEIPT` handle from its existing bounded evidence registry and
an exact post-apply native fingerprint. The native adapter then checks,
synchronously before `Undo.undo()`, that (1) the correct project is active,
(2) no edit is open, (3) the current history entry is **the final entry**,
(4) its private token and recipe/project/before/after provenance match,
and (5) the currently owned Cube snapshot still matches the receipt.
After native Undo, the original fingerprint is rechecked. Any uncertainty
is a refusal or `RECIPE_POSTCOMMIT_UNDO_UNVERIFIED`, never an automatic
retry or an unscoped history traversal. The eligibility is ephemeral and
is lost when native history changes or the service's evidence handle expires.

This is an **explicit owner-mediated recovery path**, not automatic
rollback triggered by landmark measurements, a public fifth Gateway tool,
or a guarantee that live Blockbench Undo has passed acceptance. The
existing `CorrectionLoopRegistry` continues to veto incompatible or
regressed measurements without invoking native mutation.
