import { z } from "zod";

export const interpolationEnum = z.enum(["linear", "catmullrom", "bezier", "step"]);
export const animationChannelEnum = z.enum(["rotation", "position", "scale"]);
export const loopModeEnum = z.enum(["once", "loop", "hold"]);
