# Runtime Tests

This directory owns executable Runtime/transport behavior contracts.

```text
runtime-extension-composition.test.ts  Runtime extension composition
runtime-immutable-descriptors.test.ts  descriptor immutability behavior
runtime-project-reference.test.ts      Runtime project-reference semantics
runtime-tls.test.ts                    TLS/runtime connection behavior
net-pending-bind-shutdown.test.ts      pending bind/shutdown behavior
p1-stateless-net-integration.test.ts   stateless network integration
p1-stateless-sdk-sequence.test.ts      stateless SDK request sequence
p1-transport-stateless.test.ts         stateless transport contract
```

Repository ownership/naming tests belong under `tests/repository/`; live Blockbench tests belong under `tests/live/`.
