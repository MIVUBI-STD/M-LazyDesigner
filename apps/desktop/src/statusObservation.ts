/** Bound read-only IPC waits; mutations must retain their own outcome handling. */
export async function observeStatus<T>(response: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      response,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Status request timed out. Refresh to retry.')), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
