import { buildAffectedExecutionPlan } from "./plan-affected-execution";

function commandArgv(command: string): string[] {
  if (command.startsWith("bun run ")) {
    const script = command.slice("bun run ".length).trim();
    if (!script || /\s/.test(script)) {
      throw new Error(`Unsupported affected run command: ${command}`);
    }
    return [process.execPath, "run", script];
  }

  if (command.startsWith("bun test ")) {
    const files = command
      .slice("bun test ".length)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (files.length === 0) {
      throw new Error(`Affected test command has no files: ${command}`);
    }
    return [process.execPath, "test", ...files];
  }

  throw new Error(`Unsupported affected verification command: ${command}`);
}

export async function runAffectedCommand(command: string): Promise<void> {
  const child = Bun.spawn(commandArgv(command), {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(
      `Affected verification command failed with exit code ${exitCode}: ${command}`
    );
  }
}

async function main() {
  const changedPaths = process.argv.slice(2).filter(Boolean);
  const plan = buildAffectedExecutionPlan(changedPaths);

  console.log(
    JSON.stringify(
      {
        changed_paths: plan.execution.changed_paths,
        checks: plan.execution.checks,
        targeted_tests: plan.execution.targeted_tests,
        fallback_full_verify: plan.execution.fallback_full_verify,
      },
      null,
      2
    )
  );

  for (const command of plan.execution.commands) {
    console.log(`[affected] ${command}`);
    await runAffectedCommand(command);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
