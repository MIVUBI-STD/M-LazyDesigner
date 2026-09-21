/// <reference types="blockbench-types" />

import { createUvLayoutService } from "@/lib/uv/service";
import {
  createBlockbenchUvApplyAdapter,
  readBlockbenchUvNativeSource,
} from "@/server/runtime/uvLayoutRuntime";

export function createBlockbenchUvLayoutService() {
  return createUvLayoutService({
    readSource: readBlockbenchUvNativeSource,
    createApplyAdapter: createBlockbenchUvApplyAdapter,
  });
}
