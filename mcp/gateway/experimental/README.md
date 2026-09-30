# Gateway Experimental Surface

Contains opt-in experimental Gateway implementations and generated experimental schemas.

Rules:

```text
experimental -> stable contracts          allowed
stable source -> experimental static import forbidden
Gateway index -> lazy experimental load   allowed after explicit profile selection
```

Nothing in this folder is a production-default implementation owner. Promotion requires separate evidence and an explicit architecture change; do not make stable behavior depend on experimental code as a shortcut.
