type RecentProjectEntry = {
  name?: unknown;
  path?: unknown;
  day?: unknown;
  favorite?: unknown;
};

type NavigationSnapshot = {
  schema: 1;
  observed_at_unix_ms: number;
  revision: number;
  active: {
    uuid: string;
    name: string;
    model_path: string | null;
    saved: boolean;
  } | null;
  recent_models: Array<{
    name: string;
    path: string;
    day: number | null;
    favorite: boolean;
  }>;
};

type NativeFs = Pick<
  typeof import("node:fs"),
  "mkdirSync" | "writeFileSync" | "renameSync" | "rmSync"
>;

let listeners: Array<{ delete(): void }> = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let fs: NativeFs | null = null;
let outputPath: string | null = null;
let lastSignature = "";
let revision = 0;

function modelPath(project: ModelProject | null | undefined): string | null {
  if (!project) return null;
  for (const value of [project.save_path, project.export_path]) {
    if (typeof value === "string" && /\.bbmodel$/i.test(value)) return value;
  }
  return null;
}

function recentModels(): NavigationSnapshot["recent_models"] {
  const recent = (
    globalThis as typeof globalThis & { recent_projects?: RecentProjectEntry[] }
  ).recent_projects;
  if (!Array.isArray(recent)) return [];

  const seen = new Set<string>();
  const result: NavigationSnapshot["recent_models"] = [];
  for (const entry of recent) {
    if (!entry || typeof entry.path !== "string" || !/\.bbmodel$/i.test(entry.path)) {
      continue;
    }
    const key = entry.path.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      name:
        typeof entry.name === "string" && entry.name.trim()
          ? entry.name.trim()
          : entry.path.split(/[\\/]/).pop()?.replace(/\.bbmodel$/i, "") ?? "Model",
      path: entry.path,
      day: typeof entry.day === "number" && Number.isFinite(entry.day) ? entry.day : null,
      favorite: entry.favorite === true,
    });
    if (result.length >= 128) break;
  }
  return result;
}

function buildSnapshot(): NavigationSnapshot {
  const activeProject =
    typeof Project !== "undefined" && Project && Project instanceof ModelProject
      ? Project
      : null;
  const activePath = modelPath(activeProject);
  const active = activeProject
    ? {
        uuid: String(activeProject.uuid ?? ""),
        name:
          String(activeProject.name || activeProject.model_identifier || "Untitled Project").trim() ||
          "Untitled Project",
        model_path: activePath,
        saved: Boolean(activePath),
      }
    : null;
  const recent_models = recentModels();
  const signature = JSON.stringify({
    active,
    recent: recent_models.map((entry) => [
      entry.name,
      entry.path,
      entry.day,
      entry.favorite,
    ]),
  });
  if (signature !== lastSignature) {
    lastSignature = signature;
    revision += 1;
  }
  return {
    schema: 1,
    observed_at_unix_ms: Date.now(),
    revision,
    active,
    recent_models,
  };
}

function writeSnapshot(): void {
  if (!fs || !outputPath) return;
  try {
    const snapshot = buildSnapshot();
    const slash = Math.max(outputPath.lastIndexOf("\\"), outputPath.lastIndexOf("/"));
    const directory = outputPath.slice(0, slash);
    fs.mkdirSync(directory, { recursive: true });
    const temp = outputPath + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(snapshot), "utf8");
    fs.renameSync(temp, outputPath);
  } catch (error) {
    console.error("[LazyDesigner] Project navigation snapshot update failed", error);
  }
}

function scheduleSnapshot(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    writeSnapshot();
  }, 60);
}

export function setupProjectNavigationSnapshot(): void {
  teardownProjectNavigationSnapshot();

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData || !/^[A-Za-z]:[\\/]/.test(localAppData)) return;

  // @ts-ignore - requireNativeModule is a Blockbench desktop global.
  fs = requireNativeModule("fs", {
    message: "LazyDesigner keeps a local project navigation snapshot.",
    detail:
      "This stores only recent .bbmodel paths and the active Blockbench project on this PC so the Desktop app can open them quickly.",
    optional: true,
  }) as NativeFs | null;
  if (!fs) return;

  outputPath = localAppData.replace(/[\\/]$/, "") + "\\LazyDesigner\\project-navigation.json";

  for (const event of [
    "select_project",
    "close_project",
    "load_project",
    "save_project",
    "update_recent_project_data",
  ]) {
    listeners.push(Blockbench.on(event, scheduleSnapshot));
  }
  writeSnapshot();
}

export function teardownProjectNavigationSnapshot(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  for (const listener of listeners.splice(0)) listener.delete();
  fs = null;
  outputPath = null;
}
