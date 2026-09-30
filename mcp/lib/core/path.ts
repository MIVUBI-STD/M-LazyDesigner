export function isAbsoluteFilesystemPath(value: string): boolean {
  return (
    value.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    /^\\\\[^\\]+\\[^\\]+(?:\\|$)/.test(value)
  );
}
