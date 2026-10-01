---
name: lazydesigner-mcp-development
description: Development specialist for client-visible LazyDesigner MCP contracts: tools/resources/prompts, schemas, result shapes, registration, annotations, Streamable HTTP transport, and protocol/session behavior. Do not use for visual asset defects, Blockbench-internal execution bugs, normal authoring, or Skill-system maintenance.
---

# LazyDesigner MCP Development

## Activation Contract

```text
LANE: DEVELOPMENT
DOMAIN: PRODUCT_DEVELOPMENT
CLASS: SPECIALIST
OWNER: MCP_PUBLIC_CONTRACT
```

Enter only when the requested or evidenced change is client-visible MCP behavior. Do not enter merely because normal authoring uses MCP, a model looks wrong, Blockbench is mentioned, or a Skill needs maintenance. A correct MCP contract with incorrect Blockbench execution belongs to `lazydesigner-blockbench-development`.


Own **client-visible MCP semantics**. The active development route defines goal/scope; `mcp/AGENTS.md` owns package-wide schema/runtime/result/docs/security rules. Do not repeat those rules here.

## Use This Owner For

- tool/resource/prompt public registration and descriptions;
- accepted/rejected input, defaults, optionality, refinements, and protocol errors;
- result/`structuredContent` contract decisions;
- MCP annotations;
- request-owned registration/reconstruction;
- Streamable HTTP / MCP protocol/session behavior;
- SDK compatibility where the MCP boundary itself changes.

Route elsewhere when the primary semantic owner is:

```text
Blockbench API/lifecycle/UI/Undo → lazydesigner-blockbench-development
visual/model judgement           → lazydesigner-modelling
TypeScript/Bun compile/build mechanics → exact source/build owner under mcp/AGENTS.md
```

TypeScript and Bun do not need standalone specialists merely because this implementation uses them. Do not stack specialists when the client-visible MCP contract already owns the decision.

## Decision Procedure

1. **Name the exact client-visible contract.** State what a caller currently sees/accepts and what must change.
2. **Preflight generated ownership.** If a public schema/description/spec or canonical runtime prompt may change, satisfy the relevant generated-output capability preflight in `mcp/AGENTS.md` **before implementation**; do not accumulate source/prompt edits until the active channel can produce the required canonical generated state.
3. **Prove ownership.** Distinguish an MCP contract defect from underlying Blockbench/runtime behavior or ordinary implementation-language/build mechanics.
4. **Inspect the narrow owner.** Start with affected source/direct callers; inspect `lib/factories.ts`, shared schemas, registration profile, or `server/net.ts` only when the contract touches them.
5. **Make the smallest contract change.** Reuse current factories/Zod/official SDK architecture. Do not add pagination, profiles, fallback APIs, transports, formats, or abstractions unless the requirement actually needs them.
6. **Keep advertised and runtime semantics aligned.** Required/optional/default/refinement behavior, branch intent, annotations, descriptions, errors, and result shape must tell the same story as execution.
7. **Update generated/public ownership through its source.** Never patch generated docs or prompt manifests as the implementation.
8. **Use the proof budget from the active development route.** Static contract proof is not live Blockbench or visual proof.

## Efficiency Checks

When the task is about AI/Codex usage, prefer source-provable waste first:

- duplicated equivalent result representations;
- summary tools returning detail owned by focused reads;
- stale/duplicated public descriptions or prompt content;
- unnecessarily broad defaults where a larger explicit bound already exists.

Do **not** infer model-visible token cost from character count alone, remove retained capability solely to lower tool count, or build a custom router/profile without client evidence.

## Completion

Return to the same development route and confirm:

- the intended MCP contract changed and unrelated contracts did not;
- public schema/description/result semantics match implementation;
- required generated state/gates are current;
- any live/runtime evidence still unavailable is reported rather than inferred.
