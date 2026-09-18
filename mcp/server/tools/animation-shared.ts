/// <reference types="blockbench-types" />

import { z } from "zod";
import { resolveCoreGroup } from "@/lib/coreIdentity";

export const finiteAnimationVector3Schema = z.array(z.number().finite()).length(3);

export function toArrayVector3(values: readonly number[]): ArrayVector3 {
  if (values.length !== 3) {
    throw new Error(`Expected exactly 3 vector components, got ${values.length}.`);
  }
  return [values[0], values[1], values[2]];
}

export function resolveAnimationRigGroup(reference: string): Group {
  return resolveCoreGroup(
    reference,
    "Use inspect_elements(mode=outline) to confirm the intended Group UUID."
  );
}
