export type IncrementalRevision = string;

type InputRecord = {
  value: unknown;
  revision: IncrementalRevision;
};

type DependencySnapshot =
  | { kind: "input"; id: string; revision: IncrementalRevision }
  | { kind: "query"; id: string; revision: IncrementalRevision };

type QueryDefinition<T> = {
  compute: (context: IncrementalQueryContext) => T;
  fingerprint: (value: T) => IncrementalRevision;
};

type QueryCacheEntry<T> = {
  value: T;
  revision: IncrementalRevision;
  dependencies: DependencySnapshot[];
};

export type IncrementalQueryResult<T> = {
  value: T;
  revision: IncrementalRevision;
  reused: boolean;
  early_cutoff: boolean;
};

export type IncrementalQueryStats = {
  computations: number;
  cache_hits: number;
  early_cutoffs: number;
};

export type IncrementalQueryContext = {
  input<T>(id: string): T;
  query<T>(id: string): T;
};

/**
 * Small in-process dependency-aware query engine for semantic compilation.
 *
 * It intentionally implements only the proven subset LazyDesigner needs:
 * explicit input revisions, query dependency tracking, memoization, cycle
 * detection, and early cutoff when changed dependencies produce the same
 * semantic output revision.
 */
export class IncrementalQueryEngine {
  private readonly inputs = new Map<string, InputRecord>();
  private readonly definitions = new Map<string, QueryDefinition<unknown>>();
  private readonly cache = new Map<string, QueryCacheEntry<unknown>>();
  private readonly evaluating = new Set<string>();
  private readonly statsState: IncrementalQueryStats = {
    computations: 0,
    cache_hits: 0,
    early_cutoffs: 0,
  };

  setInput<T>(
    id: string,
    value: T,
    revision: IncrementalRevision
  ): void {
    this.inputs.set(id, { value, revision });
  }

  defineQuery<T>(
    id: string,
    definition: QueryDefinition<T>
  ): void {
    this.definitions.set(
      id,
      definition as QueryDefinition<unknown>
    );
  }

  clearQuery(id: string): void {
    this.cache.delete(id);
  }

  clearAll(): void {
    this.cache.clear();
  }

  stats(): IncrementalQueryStats {
    return { ...this.statsState };
  }

  run<T>(id: string): IncrementalQueryResult<T> {
    return this.runInternal(id) as IncrementalQueryResult<T>;
  }

  private currentDependency(
    dependency: DependencySnapshot
  ): DependencySnapshot | null {
    if (dependency.kind === "input") {
      const current = this.inputs.get(dependency.id);
      return current
        ? {
            kind: "input",
            id: dependency.id,
            revision: current.revision,
          }
        : null;
    }

    const current = this.runInternal(dependency.id);
    return {
      kind: "query",
      id: dependency.id,
      revision: current.revision,
    };
  }

  private cacheIsCurrent(entry: QueryCacheEntry<unknown>): boolean {
    for (const dependency of entry.dependencies) {
      const current = this.currentDependency(dependency);
      if (!current || current.revision !== dependency.revision) {
        return false;
      }
    }
    return true;
  }

  private runInternal(id: string): IncrementalQueryResult<unknown> {
    const definition = this.definitions.get(id);
    if (!definition) {
      throw new Error(`Unknown incremental query "${id}".`);
    }
    if (this.evaluating.has(id)) {
      throw new Error(`Incremental query cycle detected at "${id}".`);
    }

    const cached = this.cache.get(id);
    if (cached && this.cacheIsCurrent(cached)) {
      this.statsState.cache_hits += 1;
      return {
        value: cached.value,
        revision: cached.revision,
        reused: true,
        early_cutoff: false,
      };
    }

    this.evaluating.add(id);
    const dependencies: DependencySnapshot[] = [];
    const context: IncrementalQueryContext = {
      input: <T>(inputId: string): T => {
        const input = this.inputs.get(inputId);
        if (!input) {
          throw new Error(
            `Incremental query "${id}" requested unknown input "${inputId}".`
          );
        }
        dependencies.push({
          kind: "input",
          id: inputId,
          revision: input.revision,
        });
        return input.value as T;
      },
      query: <T>(queryId: string): T => {
        const result = this.runInternal(queryId);
        dependencies.push({
          kind: "query",
          id: queryId,
          revision: result.revision,
        });
        return result.value as T;
      },
    };

    try {
      this.statsState.computations += 1;
      const value = definition.compute(context);
      const revision = definition.fingerprint(value);
      const earlyCutoff = cached?.revision === revision;
      if (earlyCutoff) this.statsState.early_cutoffs += 1;

      this.cache.set(id, {
        value,
        revision,
        dependencies,
      });

      return {
        value,
        revision,
        reused: false,
        early_cutoff: earlyCutoff,
      };
    } finally {
      this.evaluating.delete(id);
    }
  }
}
