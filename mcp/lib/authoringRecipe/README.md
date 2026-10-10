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

This is **pre-commit transaction safety**, not automatic rollback of a
previously committed edit after a visual comparison. External landmark
diagnosis is a read-only convergence veto and has no native mutation
authority; a later measured regression requires the execution owner to
perform a separate validated recovery rather than claiming that Undo
already happened. Native live acceptance remains distinct from source tests.
