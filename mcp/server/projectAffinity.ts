import type { RuntimeProjectHealth } from "@/lib/runtimeAffinity";

export class RuntimeProjectContextError extends Error {
  constructor (
    message: string,
    readonly outcomeUnknown: boolean = false
  ) {
    super(message);
    this.name = "RuntimeProjectContextError";
  }
}

function runtimeProjects (): ModelProject[] {
  return typeof ModelProject !== "undefined" && Array.isArray(ModelProject.all)
    ? ModelProject.all
    : [];
}

function currentRuntimeProject (): ModelProject | null {
  return typeof Project !== "undefined" && Project ? Project : null;
}

let runtimeProjectAffinityLease: {
  previousProject: ModelProject | null;
} | null = null;

export function getRuntimeProjectHealth (
  requestedProjectUuid: string | null
): RuntimeProjectHealth {
  const projects = runtimeProjects();
  const currentProject = currentRuntimeProject();
  const leasedPreviousProject =
    runtimeProjectAffinityLease?.previousProject ?? null;
  const activeProject = runtimeProjectAffinityLease
    ? leasedPreviousProject && projects.includes(leasedPreviousProject)
      ? leasedPreviousProject
      : null
    : currentProject;
  const requestedProject = requestedProjectUuid
    ? projects.find((project) => project.uuid === requestedProjectUuid) ?? null
    : null;

  return {
    active_project_uuid: activeProject?.uuid ?? null,
    requested_project_uuid: requestedProjectUuid,
    requested_project_available: requestedProjectUuid
      ? requestedProject !== null
      : null,
    open_project_count: projects.length,
  };
}

export async function runWithRuntimeProjectAffinity<T> (
  requestedProjectUuid: string | null,
  allowProjectTransition: boolean,
  operation: () => Promise<T>
): Promise<T> {
  if (!requestedProjectUuid) return await operation();

  const projects = runtimeProjects();
  const target = projects.find(
    (project) => project.uuid === requestedProjectUuid
  );
  if (!target) {
    throw new RuntimeProjectContextError(
      `Gateway-bound Blockbench project ${requestedProjectUuid} is no longer open.`
    );
  }

  const previousProject = currentRuntimeProject();
  let switched = false;

  if (previousProject !== target) {
    if (previousProject?.locked || target.locked) {
      throw new RuntimeProjectContextError(
        `Blockbench cannot activate Gateway-bound project ${requestedProjectUuid} because the current or target project tab is locked.`
      );
    }
    const selected = target.select();
    if (selected !== true || currentRuntimeProject() !== target) {
      throw new RuntimeProjectContextError(
        `Blockbench could not activate Gateway-bound project ${requestedProjectUuid}.`
      );
    }
    switched = true;
  }

  const originalTargetLocked = target.locked === true;
  const lease = { previousProject };
  runtimeProjectAffinityLease = lease;
  if (!allowProjectTransition) target.locked = true;

  try {
    const result = await operation();
    if (!allowProjectTransition && currentRuntimeProject() !== target) {
      throw new RuntimeProjectContextError(
        `Blockbench project context changed while Gateway-bound project ${requestedProjectUuid} was executing.`,
        true
      );
    }
    return result;
  } finally {
    const stillOpen = runtimeProjects().includes(target);
    if (!allowProjectTransition && stillOpen) {
      target.locked = originalTargetLocked;
    }

    if (runtimeProjectAffinityLease === lease) {
      runtimeProjectAffinityLease = null;
    }

    if (
      !allowProjectTransition &&
      switched &&
      previousProject &&
      runtimeProjects().includes(previousProject) &&
      currentRuntimeProject() !== previousProject
    ) {
      previousProject.select();
    }
  }
}
