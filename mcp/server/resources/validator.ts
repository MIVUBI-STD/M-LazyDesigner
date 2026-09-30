/// <reference types="three" />
/// <reference types="blockbench-types" />

import { createResource } from "@/lib/factories";
import { deriveValidatorGateVerdict } from "@/lib/authoring/validationVerdict";

interface ValidatorButton {
  name: string;
  icon: string;
  color?: string;
  click: (event?: Event) => void;
}

interface ValidatorProblem {
  message: string;
  buttons?: ValidatorButton[];
  error?: boolean;
}

interface ValidatorCheckInstance {
  id: string;
  type?: string;
  update_triggers: string[];
  condition?: unknown;
  errors: ValidatorProblem[];
  warnings: ValidatorProblem[];
  plugin?: string;
}

interface ValidatorSingleton {
  checks: ValidatorCheckInstance[];
  warnings: ValidatorProblem[];
  errors: ValidatorProblem[];
  triggers: string[];
  validate: (trigger?: string) => void;
}

declare const Validator: ValidatorSingleton;

function refreshValidation(): void {
  Validator.validate();
}

export function summarizeActiveValidatorChecks(
  checks: readonly {
    id: string;
    errors: readonly unknown[];
    warnings: readonly unknown[];
  }[]
) {
  return checks.flatMap((check) => {
    const errorCount = check.errors.length;
    const warningCount = check.warnings.length;
    const totalProblems = errorCount + warningCount;
    if (totalProblems === 0) return [];

    return [
      {
        id: check.id,
        errorCount,
        warningCount,
        totalProblems,
        detail_uri: `validator://checks/${check.id}`,
      },
    ];
  });
}

export function extractElementRefs(problem: ValidatorProblem): {
  type?: string;
  name?: string;
  uuid?: string;
}[] {
  const refs: { type?: string; name?: string; uuid?: string }[] = [];

  if (!problem.buttons) return refs;

  const cubeMatch = problem.message.match(/cube\s+"([^"]+)"/i);
  if (cubeMatch) {
    const cubeName = cubeMatch[1];
    const matches = Cube.all.filter((c) => c.name === cubeName);
    const cube = matches.length === 1 ? matches[0] : undefined;
    if (cube) {
      refs.push({ type: "cube", name: cube.name, uuid: cube.uuid });
    }
  }

  const textureMatch = problem.message.match(/texture\s+"([^"]+)"/i);
  if (textureMatch) {
    const textureName = textureMatch[1];
    const matches = Texture.all.filter(
      (t) => t.name === textureName || t.folder + "/" + t.name === textureName
    );
    const texture = matches.length === 1 ? matches[0] : undefined;
    if (texture) {
      refs.push({ type: "texture", name: texture.name, uuid: texture.uuid });
    }
  }

  const animationMatch = problem.message.match(/in\s+"([^"]+)"/i);
  if (animationMatch) {
    const animName = animationMatch[1];
    // @ts-ignore - Animation.all exists at runtime
    const matches = Animation.all?.filter((a: { name: string; uuid: string }) => a.name === animName) ?? [];
    const animation = matches.length === 1 ? matches[0] : undefined;
    if (animation) {
      refs.push({ type: "animation", name: animation.name, uuid: animation.uuid });
    }
  }

  const boneMatch = problem.message.match(/on\s+"([^"]+)"/i);
  if (boneMatch && !animationMatch) {
    const boneName = boneMatch[1];
    const matches = Group.all.filter((g) => g.name === boneName);
    const group = matches.length === 1 ? matches[0] : undefined;
    if (group) {
      refs.push({ type: "group", name: group.name, uuid: group.uuid });
    }
  }

  return refs;
}

function serializeProblem(problem: ValidatorProblem, isError: boolean) {
  const elementRefs = extractElementRefs(problem);

  return {
    message: problem.message,
    severity: isError ? "error" : "warning",
    hasActions: (problem.buttons?.length ?? 0) > 0,
    actionNames: problem.buttons?.map((b) => b.name) ?? [],
    elementRefs,
    elementRefsSource: elementRefs.length > 0 ? "message_heuristic" : "none",
    elementRefsAuthoritative: false,
  };
}

function serializeCheck(check: ValidatorCheckInstance) {
  return {
    id: check.id,
    type: check.type ?? null,
    updateTriggers: check.update_triggers,
    plugin: check.plugin ?? null,
    currentErrors: check.errors.length,
    currentWarnings: check.warnings.length,
  };
}

export function registerValidatorResources() {
  createResource("validator-status", {
    uriTemplate: "validator://status",
    title: "Validator Status",
    description:
      "Returns fresh validation counts plus a conservative technical gate verdict. VALIDATOR_CLEAR is never visual PASS or user approval. Read validator://errors or validator://warnings only when detailed problems are needed.",
    async listCallback() {
      return {
        resources: [
          {
            uri: "validator://status",
            name: "Validation Status",
            description: "Read for a fresh validation summary",
            mimeType: "application/json",
          },
        ],
      };
    },
    async readCallback(uri) {
      refreshValidation();
      const problemChecks = summarizeActiveValidatorChecks(Validator.checks);
      const gate = deriveValidatorGateVerdict(
        Validator.errors.length,
        Validator.warnings.length
      );
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(
              {
                summary: {
                  totalProblems: Validator.errors.length + Validator.warnings.length,
                  errorCount: Validator.errors.length,
                  warningCount: Validator.warnings.length,
                  checkCount: Validator.checks.length,
                  problemCheckCount: problemChecks.length,
                  triggers: Validator.triggers,
                },
                gate,
                problem_checks: problemChecks,
                detail_resources: {
                  errors: "validator://errors",
                  warnings: "validator://warnings",
                  checks: "validator://checks",
                },
              },
              null,
              2
            ),
            mimeType: "application/json",
          },
        ],
      };
    },
  });

  createResource("validator-checks", {
    uriTemplate: "validator://checks/{id}",
    title: "Validator Checks",
    description:
      "Returns information about registered validator checks. Use without an ID to list all checks, or provide a check ID to get details about a specific check.",
    async listCallback() {
      if (Validator.checks.length === 0) {
        return { resources: [] };
      }

      return {
        resources: Validator.checks.map((check) => ({
          uri: `validator://checks/${check.id}`,
          name: check.id,
          description: `Triggers: ${check.update_triggers.join(", ") || "manual"}`,
          mimeType: "application/json",
        })),
      };
    },
    async readCallback(uri, { id }) {
      refreshValidation();
      if (!id) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  checks: Validator.checks.map(serializeCheck),
                  count: Validator.checks.length,
                  allTriggers: Validator.triggers,
                },
                null,
                2
              ),
              mimeType: "application/json",
            },
          ],
        };
      }

      const check = Validator.checks.find((c) => c.id === id);
      if (!check) {
        throw new Error(`Validator check with ID "${id}" not found.`);
      }

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(
              {
                ...serializeCheck(check),
                errors: check.errors.map((e) => serializeProblem(e, true)),
                warnings: check.warnings.map((w) => serializeProblem(w, false)),
              },
              null,
              2
            ),
            mimeType: "application/json",
          },
        ],
      };
    },
  });

  createResource("validator-warnings", {
    uriTemplate: "validator://warnings",
    title: "Validator Warnings",
    description:
      "Returns current validation warnings. Any elementRefs are best-effort message-text inferences and are explicitly marked non-authoritative.",
    async listCallback() {
      return {
        resources: [
          {
            uri: "validator://warnings",
            name: "Validation Warnings",
            description: "Read for fresh validation warnings",
            mimeType: "application/json",
          },
        ],
      };
    },
    async readCallback(uri) {
      refreshValidation();
      const warnings = Validator.warnings.map((w) => serializeProblem(w, false));

      const byElement: Record<string, typeof warnings> = {};
      const unlinked: typeof warnings = [];

      for (const warning of warnings) {
        if (warning.elementRefs.length > 0) {
          const type = warning.elementRefs[0].type ?? "unknown";
          if (!byElement[type]) byElement[type] = [];
          byElement[type].push(warning);
        } else {
          unlinked.push(warning);
        }
      }

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(
              {
                count: warnings.length,
                warnings,
                byElementType: byElement,
                unlinkedWarnings: unlinked,
              },
              null,
              2
            ),
            mimeType: "application/json",
          },
        ],
      };
    },
  });

  createResource("validator-errors", {
    uriTemplate: "validator://errors",
    title: "Validator Errors",
    description:
      "Returns current validation errors. Any elementRefs are best-effort message-text inferences and are explicitly marked non-authoritative.",
    async listCallback() {
      return {
        resources: [
          {
            uri: "validator://errors",
            name: "Validation Errors",
            description: "Read for fresh validation errors",
            mimeType: "application/json",
          },
        ],
      };
    },
    async readCallback(uri) {
      refreshValidation();
      const errors = Validator.errors.map((e) => serializeProblem(e, true));

      const byElement: Record<string, typeof errors> = {};
      const unlinked: typeof errors = [];

      for (const error of errors) {
        if (error.elementRefs.length > 0) {
          const type = error.elementRefs[0].type ?? "unknown";
          if (!byElement[type]) byElement[type] = [];
          byElement[type].push(error);
        } else {
          unlinked.push(error);
        }
      }

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(
              {
                count: errors.length,
                errors,
                byElementType: byElement,
                unlinkedErrors: unlinked,
              },
              null,
              2
            ),
            mimeType: "application/json",
          },
        ],
      };
    },
  });
}