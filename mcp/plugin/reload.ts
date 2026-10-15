type ReloadableLazyDesignerPlugin = {
  id?: string;
  source?: string;
  path?: string;
  reload?: () => unknown;
  isReloadable?: () => boolean;
};

export function getReloadableLazyDesignerPlugin(): ReloadableLazyDesignerPlugin | null {
  const pluginState = Plugins as unknown as {
    registered?: Record<string, ReloadableLazyDesignerPlugin>;
    all?: ReloadableLazyDesignerPlugin[];
  };
  return (
    pluginState.registered?.lazydesigner_mcp ??
    pluginState.all?.find((plugin) => plugin.id === "lazydesigner_mcp") ??
    null
  );
}

export function canReloadLazyDesignerPlugin(): boolean {
  const plugin = getReloadableLazyDesignerPlugin();
  return Boolean(
    plugin &&
      typeof plugin.reload === "function" &&
      (typeof plugin.isReloadable !== "function" || plugin.isReloadable())
  );
}

export function reloadLazyDesignerPlugin(): boolean {
  const plugin = getReloadableLazyDesignerPlugin();
  if (
    !plugin ||
    typeof plugin.reload !== "function" ||
    (typeof plugin.isReloadable === "function" && !plugin.isReloadable())
  ) {
    return false;
  }

  try {
    plugin.reload();
    return true;
  } catch (error) {
    console.error("[MCP] Manual LazyDesigner reload failed", error);
    return false;
  }
}
