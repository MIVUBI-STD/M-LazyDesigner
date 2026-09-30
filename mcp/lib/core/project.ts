/// <reference types="blockbench-types" />

export function requireOpenProject(action: string): void {
  if (!Project) {
    throw new Error(
      `No project is open. Open or create the intended Bedrock project before ${action}.`
    );
  }
}
