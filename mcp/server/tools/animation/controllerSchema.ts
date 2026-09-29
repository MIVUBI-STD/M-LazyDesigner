import { z } from "zod";

const nonEmptyAuthoredString = z
  .string()
  .refine((value) => value.trim().length > 0, {
    message: "Value must contain non-whitespace authored text.",
  });

const nonEmptyAuthoredScript = z
  .string()
  .refine((value) => value.replace(/[\n\s;.]+/g, "").length > 0, {
    message: "Script must contain an authored statement or command.",
  });

const clearableAuthoredString = z.union([nonEmptyAuthoredString, z.null()]);
const clearableAuthoredScript = z.union([nonEmptyAuthoredScript, z.null()]);

/**
 * Schema-level on_entry/on_exit accept empty strings because empty clears the
 * script; whitespace-only text is neither authored nor a clear, so it is
 * rejected here without paying union-serialization cost in the listed schema.
 */
function requireAuthoredScriptText(
  value: string | undefined,
  field: "on_entry" | "on_exit"
): void {
  if (value !== undefined && value.trim().length === 0) {
    throw new Error(
      `${field} must contain non-whitespace authored text; pass an empty string to clear it.`
    );
  }
}

const controllerBlendValueSchema = z.union([
  z.number().finite(),
  nonEmptyAuthoredString,
]);

export const controllerOperationSchema = z
  .object({
    op: z
      .enum([
        "rename_controller",
        "add_state",
        "update_state",
        "remove_state",
        "set_initial_state",
        "add_transition",
        "update_transition",
        "remove_transition",
        "add_animation",
        "update_animation",
        "remove_animation",
        "add_sound",
        "update_sound",
        "remove_sound",
        "add_particle",
        "update_particle",
        "remove_particle",
      ])
      .describe("Controller mutation to apply."),
    state: z
      .string()
      .min(1)
      .optional()
      .describe("Exact state UUID or unique exact state name."),
    id: z
      .string()
      .min(1)
      .optional()
      .describe("Exact transition, animation-link, sound, or particle UUID."),
    name: z
      .string()
      .min(1)
      .optional()
      .describe("Controller/state name for rename or add_state."),
    target: z
      .string()
      .min(1)
      .optional()
      .describe("Exact transition target state UUID/name."),
    animation: z
      .string()
      .min(1)
      .optional()
      .describe("Exact authored Animation UUID/name."),
    condition: nonEmptyAuthoredString
      .optional()
      .describe("Non-empty authored transition Molang condition."),
    blend_value: controllerBlendValueSchema
      .optional()
      .describe("Finite number or authored Molang blend value."),
    effect: nonEmptyAuthoredString
      .optional()
      .describe("Bedrock sound/particle effect identifier."),
    locator: clearableAuthoredString
      .optional()
      .describe("Particle Locator name; null clears to entity space."),
    bind_to_actor: z
      .union([z.boolean(), z.null()])
      .optional()
      .describe("Particle actor binding; null resets to native default true."),
    pre_effect_script: clearableAuthoredScript
      .optional()
      .describe("Particle pre-effect Molang; null clears."),
    on_entry: z
      .string()
      .optional()
      .describe("State on_entry script; empty clears."),
    on_exit: z
      .string()
      .optional()
      .describe("State on_exit script; empty clears."),
    blend_transition: z
      .number()
      .finite()
      .min(0)
      .max(10000)
      .optional()
      .describe("State blend duration in seconds."),
    blend_via_shortest_path: z
      .boolean()
      .optional()
      .describe("State shortest-path blend flag."),
  })
  .strict()
  .superRefine((operation, ctx) => {
    const present = new Set(
      Object.entries(operation)
        .filter(([, value]) => value !== undefined)
        .map(([key]) => key)
    );
    const require = (...fields: string[]) => {
      for (const field of fields) {
        if (!present.has(field)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required when op=${operation.op}.`,
          });
        }
      }
    };
    const allow = (...fields: string[]) => {
      const allowed = new Set(["op", ...fields]);
      for (const field of present) {
        if (!allowed.has(field)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is not used when op=${operation.op}.`,
          });
        }
      }
    };

    switch (operation.op) {
      case "rename_controller":
        require("name");
        allow("name");
        break;
      case "add_state":
        require("name");
        allow(
          "name",
          "on_entry",
          "on_exit",
          "blend_transition",
          "blend_via_shortest_path"
        );
        requireAuthoredScriptText(operation.on_entry, "on_entry");
        requireAuthoredScriptText(operation.on_exit, "on_exit");
        break;
      case "update_state": {
        require("state");
        allow(
          "state",
          "name",
          "on_entry",
          "on_exit",
          "blend_transition",
          "blend_via_shortest_path"
        );
        if (
          operation.name === undefined &&
          operation.on_entry === undefined &&
          operation.on_exit === undefined &&
          operation.blend_transition === undefined &&
          operation.blend_via_shortest_path === undefined
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "update_state requires at least one authored field.",
          });
        }
        requireAuthoredScriptText(operation.on_entry, "on_entry");
        requireAuthoredScriptText(operation.on_exit, "on_exit");
        break;
      }
      case "remove_state":
      case "set_initial_state":
        require("state");
        allow("state");
        break;
      case "add_transition":
        require("state", "target", "condition");
        allow("state", "target", "condition");
        break;
      case "update_transition":
        require("state", "id");
        allow("state", "id", "target", "condition");
        if (operation.target === undefined && operation.condition === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "update_transition requires target and/or condition.",
          });
        }
        break;
      case "remove_transition":
        require("state", "id");
        allow("state", "id");
        break;
      case "add_animation":
        require("state", "animation");
        allow("state", "animation", "blend_value");
        break;
      case "update_animation":
        require("state", "id");
        allow("state", "id", "animation", "blend_value");
        if (
          operation.animation === undefined &&
          operation.blend_value === undefined
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "update_animation requires animation and/or blend_value.",
          });
        }
        break;
      case "remove_animation":
        require("state", "id");
        allow("state", "id");
        break;
      case "add_sound":
        require("state", "effect");
        allow("state", "effect");
        break;
      case "update_sound":
        require("state", "id", "effect");
        allow("state", "id", "effect");
        break;
      case "remove_sound":
        require("state", "id");
        allow("state", "id");
        break;
      case "add_particle":
        require("state", "effect");
        allow(
          "state",
          "effect",
          "locator",
          "bind_to_actor",
          "pre_effect_script"
        );
        break;
      case "update_particle":
        require("state", "id");
        allow(
          "state",
          "id",
          "effect",
          "locator",
          "bind_to_actor",
          "pre_effect_script"
        );
        if (
          operation.effect === undefined &&
          operation.locator === undefined &&
          operation.bind_to_actor === undefined &&
          operation.pre_effect_script === undefined
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "update_particle requires at least one authored particle field.",
          });
        }
        break;
      case "remove_particle":
        require("state", "id");
        allow("state", "id");
        break;
    }
  });

export const manageAnimationControllerParameters = z
  .object({
    controller_id: z
      .string()
      .min(1)
      .optional()
      .describe("Existing controller UUID or unique name."),
    create_name: z
      .string()
      .min(1)
      .optional()
      .describe("New controller name."),
    operations: z
      .array(controllerOperationSchema)
      .min(1)
      .max(32)
      .describe("Ordered controller/state mutations (1-32)."),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.controller_id === undefined) === (value.create_name === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of controller_id or create_name.",
      });
    }
  });

export const animationControllerToolDocs: ToolSpec[] = [
  {
    name: "manage_animation_controller",
    description:
      "Creates/updates Bedrock AnimationControllers plus bounded client-entity animation/Molang runtime wiring, public/init/pre-animation scripts, scale, and controller variables without adding another tool.",
    annotations: {
      title: "Manage Animation Controller",
      destructiveHint: true,
    },
    parameters: manageAnimationControllerParameters,
    status: STATUS_EXPERIMENTAL,
  },
];

export type ControllerMutationOperation = z.infer<typeof controllerOperationSchema>;
