export type NativeIkControllerIntent = {
  controller: string;
  target?: string | null;
  source?: string | null;
  pole?: string | null;
  lock_target_rotation?: boolean;
};

export function compileNativeIkControllerIntent(intent: NativeIkControllerIntent) {
  if (!intent.controller) throw new Error("Native IK controller intent requires controller identity.");
  if (
    intent.target === undefined &&
    intent.source === undefined &&
    intent.pole === undefined &&
    intent.lock_target_rotation === undefined
  ) {
    throw new Error("Native IK controller intent requires at least one authored controller field.");
  }
  return {
    action: "set_ik_controller" as const,
    bone_data: {
      controller: intent.controller,
      ...(intent.target !== undefined ? { controller_target: intent.target } : {}),
      ...(intent.source !== undefined ? { controller_source: intent.source } : {}),
      ...(intent.pole !== undefined ? { controller_pole: intent.pole } : {}),
      ...(intent.lock_target_rotation !== undefined
        ? { lock_ik_target_rotation: intent.lock_target_rotation }
        : {}),
    },
  };
}
