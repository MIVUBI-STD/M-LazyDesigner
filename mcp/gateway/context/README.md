# Gateway Authoring Context Contract

Owns neutral authoring-context vocabulary shared by Product Control and Repository Development Intelligence.

```text
authoring.ts
  GatewayAuthoringDomain
  capability → authoring domain classification
  canonical specialist Skill paths
```

Dependency direction:

```text
context -> lib/capabilities
control -> context
development -> context

context -X-> control
context -X-> development
```

This folder does not own context loading, source ownership, development diagnosis, Runtime state, or workflow orchestration.
