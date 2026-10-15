<script lang="ts">
  import type { ProjectAction, ProjectNavigation, ProjectNavigationProject } from './projectNavigationTypes';

  export let navigation: ProjectNavigation;
  export let busy = false;
  export let canOpenModel = true;
  export let canEditProjectPrefs = true;
  export let onOpenModel: (id: string) => void | Promise<void>;
  export let onFocusEditor: () => void | Promise<void>;
  export let onProjectAction: (action: ProjectAction, id: string) => void | Promise<void>;
  export let onCopyPath: (id: string) => void | Promise<void>;

  // Bound by App: avoid losing the user's place on Support navigation.
  export let expandedProjectId: string | null = null;
  export let showAllProjects = false;
  export let projectSearch = '';
  export let modelSearch = '';

  // Legacy Svelte tracks template arguments, not reads hidden inside helpers.
  const recentProjects = (state: ProjectNavigation) =>
    state.projects.filter(project => !project.active);

  const visibleRecentProjects = (state: ProjectNavigation, search: string, showAll: boolean) => {
    const query = search.trim().toLowerCase();
    const projects = recentProjects(state).filter(project =>
      !query
      || project.name.toLowerCase().includes(query)
      || project.models.some(model => model.name.toLowerCase().includes(query))
    );
    return query || showAll ? projects : projects.slice(0, 5);
  };

  const visibleProjectModels = (project: ProjectNavigationProject, search: string) => {
    const query = search.trim().toLowerCase();
    return query
      ? project.models.filter(model => model.name.toLowerCase().includes(query))
      : project.models;
  };

  // Recent-file order comes from Blockbench, not from pinned/project order.
  const recentModelTargets = (state: ProjectNavigation) =>
    (state.recent_model_ids ?? []).flatMap(id =>
      state.projects.flatMap(project =>
        project.models
          .filter(model => model.id === id && model.exists && !model.active && model.id !== state.continue_model_id)
          .map(model => ({ project, model }))
      ).slice(0, 1)
    );

  const continueTarget = (state: ProjectNavigation) => {
    if (state.active) return null;
    const modelId = state.continue_model_id;
    if (!modelId) return null;
    for (const project of state.projects) {
      const model = project.models.find(candidate => candidate.id === modelId && candidate.exists);
      if (model) return { project, model };
    }
    return null;
  };

  function toggleProjectDetails(id: string) {
    expandedProjectId = expandedProjectId === id ? null : id;
    modelSearch = '';
  }
</script>

{#if navigation.preferences_issue}
  <section class="preferences-recovery" role="alert">
    <div>
      <strong>Project pins need attention</strong>
      <span>Saved pin preferences could not be read. Model files remain untouched.</span>
    </div>
    {#if navigation.preferences_issue === 'RECOVERABLE'}
      <button class="secondary-button small-button" onclick={() => onProjectAction('restore-project-preferences', '')} disabled={busy || !canEditProjectPrefs}>
        Restore saved pins
      </button>
    {:else}
      <span>No valid recovery copy is available. Existing data was preserved.</span>
    {/if}
  </section>
{/if}

{#if !navigation.active && continueTarget(navigation)}
  {@const target = continueTarget(navigation)}
  {#if target}
    <section class="content-section">
      <div class="section-heading">
        <div><h2>Continue working</h2></div>
      </div>
      <div class="project-list">
        <div class="project-row">
          <div class="project-main">
            <div class="project-title">{target.model.name}</div>
            {#if target.project.name !== target.model.name}
              <div class="project-meta">{target.project.name}</div>
            {/if}
          </div>
          <div class="project-actions">
            <button class="primary-button small-button" onclick={() => onOpenModel(target.model.id)} disabled={busy || !canOpenModel}>{target.model.open ? 'Open' : 'Continue'}</button>
          </div>
        </div>
      </div>
    </section>
  {/if}
{/if}

{#if navigation.active}
  {@const activeNavigation = navigation.active}
  <section class="content-section">
    <div class="section-heading">
      <div><h2>Current Model</h2></div>
    </div>
    <div class="project-list">
      <div class="project-row active-project-row">
        <div class="project-main">
          <div class="project-title">{activeNavigation.model_name}</div>
          <div class="project-meta">{activeNavigation.project_name && activeNavigation.project_name !== activeNavigation.model_name ? activeNavigation.project_name : (activeNavigation.saved ? 'Saved model' : 'Not saved yet')}{activeNavigation.dirty ? ' · Modified' : ''}</div>
        </div>
        <div class="project-actions">
          {#if activeNavigation.saved && activeNavigation.model_id}
            <button class="primary-button small-button" onclick={onFocusEditor} disabled={busy}>Go to Blockbench</button>
          {/if}
          {#if activeNavigation.project_id}
            <button class="secondary-button small-button" onclick={() => onProjectAction('open-project-folder', activeNavigation.project_id ?? '')} disabled={busy}>Open Folder</button>
            <button class="quiet-button" aria-expanded={expandedProjectId === activeNavigation.project_id} onclick={() => toggleProjectDetails(activeNavigation.project_id ?? '')}>{expandedProjectId === activeNavigation.project_id ? 'Hide details' : 'See details'}</button>
          {/if}
        </div>
      </div>

      {#if activeNavigation.project_id && expandedProjectId === activeNavigation.project_id}
        {@const activeProject = navigation.projects.find(project => project.id === activeNavigation.project_id)}
        {#if activeProject}
          <div class="project-details">
            <div class="project-details-heading">
              <span>Models</span>
              {#if activeProject.model_count > 8}
                <input class="compact-search" type="search" placeholder="Search models" aria-label="Search models" bind:value={modelSearch} />
              {/if}
            </div>
            {#each visibleProjectModels(activeProject, modelSearch) as model}
              <div class="model-row">
                <div class="model-main">
                  <strong>{model.name}</strong>
                  {#if model.active}<span>{model.dirty ? 'Active · Modified' : 'Active'}</span>{:else if model.dirty}<span>Modified</span>{:else if !model.exists}<span>Location unavailable</span>{/if}
                </div>
                <div class="model-actions">
                  {#if !model.active}
                    <button class="secondary-button small-button" onclick={() => onOpenModel(model.id)} disabled={!model.exists || busy || !canOpenModel}>Open</button>
                  {/if}
                  <details class="more-menu">
                    <summary aria-label="Model actions">•••</summary>
                    <div class="menu-popover">
                      <button onclick={() => onProjectAction('reveal-model', model.id)} disabled={!model.exists || busy}>Reveal model file</button>
                      <button onclick={() => onCopyPath(model.id)} disabled={busy}>Copy path</button>
                    </div>
                  </details>
                </div>
              </div>
            {/each}
            {#if visibleProjectModels(activeProject, modelSearch).length === 0}
              <div class="project-empty">No models found.</div>
            {/if}
            {#if activeProject.folders.length > 0}
              <div class="project-details-heading folder-heading"><span>Folders</span></div>
              <div class="folder-shortcuts">
                {#each activeProject.folders as folder}
                  <button class="folder-shortcut" onclick={() => onProjectAction('open-folder', folder.id)} disabled={busy}>{folder.label}</button>
                {/each}
              </div>
            {/if}
            <div class="project-detail-actions">
              <button class="quiet-button" onclick={() => onProjectAction(activeProject.pinned ? 'unpin-project' : 'pin-project', activeProject.id)} disabled={busy || !canEditProjectPrefs}>{activeProject.pinned ? 'Unpin project' : 'Pin project'}</button>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </section>
{/if}

{#if recentModelTargets(navigation).length > 0}
  <section class="content-section">
    <div class="section-heading"><div><h2>Recent Models</h2></div></div>
    <div class="project-list">
      {#each recentModelTargets(navigation) as target (target.model.id)}
        <div class="project-row">
          <div class="project-main">
            <div class="project-title">{target.model.name}</div>
            <div class="project-meta">{target.project.name}</div>
          </div>
          <div class="project-actions">
            <button class="secondary-button small-button" onclick={() => onOpenModel(target.model.id)} disabled={busy || !canOpenModel}>Open</button>
          </div>
        </div>
      {/each}
    </div>
  </section>
{/if}

{#if recentProjects(navigation).length > 0}
  <section class="content-section">
    <div class="section-heading">
      <div><h2>Recent Projects</h2></div>
      {#if recentProjects(navigation).length > 5}
        <input class="compact-search project-search" type="search" placeholder="Search projects" aria-label="Search projects" bind:value={projectSearch} />
      {/if}
    </div>
    <div class="project-list">
      {#each visibleRecentProjects(navigation, projectSearch, showAllProjects) as project}
        <div class="project-row">
          <div class="project-main">
            <div class="project-title" title={project.name}>{project.name}</div>
            <div class="project-meta">{project.model_count} {project.model_count === 1 ? 'model' : 'models'}{#if project.pinned}<span class="pinned-label"> · Pinned</span>{/if}</div>
          </div>
          <div class="project-actions">
            <button class="secondary-button small-button" onclick={() => onProjectAction('open-project-folder', project.id)} disabled={busy}>Open Folder</button>
            <button class="quiet-button" aria-expanded={expandedProjectId === project.id} onclick={() => toggleProjectDetails(project.id)}>{expandedProjectId === project.id ? 'Hide details' : 'See details'}</button>
          </div>
        </div>
        {#if expandedProjectId === project.id}
          <div class="project-details">
            <div class="project-details-heading">
              <span>Models</span>
              {#if project.model_count > 8}
                <input class="compact-search" type="search" placeholder="Search models" aria-label="Search models" bind:value={modelSearch} />
              {/if}
            </div>
            {#each visibleProjectModels(project, modelSearch) as model}
              <div class="model-row">
                <div class="model-main">
                  <strong>{model.name}</strong>
                  {#if model.dirty}<span>Modified</span>{:else if !model.exists}<span>Location unavailable</span>{/if}
                </div>
                <div class="model-actions">
                  <button class="secondary-button small-button" onclick={() => onOpenModel(model.id)} disabled={!model.exists || busy || !canOpenModel}>Open</button>
                  <details class="more-menu">
                    <summary aria-label="Model actions">•••</summary>
                    <div class="menu-popover">
                      <button onclick={() => onProjectAction('reveal-model', model.id)} disabled={!model.exists || busy}>Reveal model file</button>
                      <button onclick={() => onCopyPath(model.id)} disabled={busy}>Copy path</button>
                    </div>
                  </details>
                </div>
              </div>
            {/each}
            {#if visibleProjectModels(project, modelSearch).length === 0}
              <div class="project-empty">No models found.</div>
            {/if}
            {#if project.folders.length > 0}
              <div class="project-details-heading folder-heading"><span>Folders</span></div>
              <div class="folder-shortcuts">
                {#each project.folders as folder}
                  <button class="folder-shortcut" onclick={() => onProjectAction('open-folder', folder.id)} disabled={busy}>{folder.label}</button>
                {/each}
              </div>
            {/if}
            <div class="project-detail-actions">
              <button class="quiet-button" onclick={() => onProjectAction(project.pinned ? 'unpin-project' : 'pin-project', project.id)} disabled={busy || !canEditProjectPrefs}>{project.pinned ? 'Unpin project' : 'Pin project'}</button>
            </div>
          </div>
        {/if}
      {/each}
      {#if visibleRecentProjects(navigation, projectSearch, showAllProjects).length === 0}
        <div class="project-empty project-empty-list">No projects found.</div>
      {/if}
    </div>
    {#if recentProjects(navigation).length > 5 && !projectSearch.trim()}
      <button class="show-more-button" onclick={() => { showAllProjects = !showAllProjects; if (!showAllProjects) expandedProjectId = null; }}>{showAllProjects ? 'Show less' : 'Show all projects'}</button>
    {/if}
  </section>
{/if}

<style>
  .preferences-recovery{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 16px;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);font-size:var(--font-sm)}
  .preferences-recovery>div{display:grid;gap:5px}.preferences-recovery span{font-size:var(--font-sm);color:var(--muted)}
  .content-section{margin-bottom:34px}
  .section-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:10px}
  .section-heading h2{margin:0;font-size:var(--font-title);font-weight:700}
  .project-list{border:1px solid var(--border-soft);border-radius:8px;overflow:hidden;background:var(--bg-elevated)}
  .project-row{min-height:62px;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:10px 12px;border-bottom:1px solid var(--border-soft)}
  .project-row:last-child{border-bottom:0}
  .project-main{min-width:0;display:grid;gap:3px}
  .project-title{font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .project-meta{color:var(--muted);font-size:var(--font-sm)}
  .project-actions,.model-actions{display:flex;align-items:center;gap:6px}
  .primary-button,.secondary-button{min-height:32px;padding:6px 11px;border-radius:6px;font-size:var(--font-sm);font-weight:700;cursor:pointer}
  .primary-button{border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink)}
  .secondary-button{border:1px solid var(--border);background:var(--surface-2);color:var(--text-soft)}
  .small-button{min-height:32px;padding:4px 9px;font-size:var(--font-sm)}
  .quiet-button,.show-more-button{border:0;background:transparent;color:var(--muted);font-size:var(--font-sm);font-weight:650;cursor:pointer}
  .quiet-button:hover,.show-more-button:hover{color:var(--text)}
  .project-details{padding:4px 12px 8px;border-bottom:1px solid var(--border-soft);background:var(--surface)}
  .project-details-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0 5px;color:var(--muted-2);font-size:var(--font-xs);font-weight:700;text-transform:uppercase;letter-spacing:.05em}
  .model-row{min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-top:1px solid var(--border-soft)}
  .model-main{min-width:0;display:flex;align-items:center;gap:7px}
  .model-main strong{font-size:var(--font-sm);font-weight:650}.model-main span{color:var(--muted-2);font-size:var(--font-xs)}
  .show-more-button{margin-top:8px;padding:4px 0}
  .compact-search{width:150px;height:34px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface-2);color:var(--text-soft);font:inherit;font-size:var(--font-sm)}
  .compact-search:focus{border-color:var(--info)}.compact-search::placeholder{color:var(--muted-2)}
  .project-search{width:180px}
  .project-empty{padding:10px 0;color:var(--muted-2);font-size:var(--font-sm)}.project-empty-list{padding:13px 12px}
  .folder-heading{margin-top:6px;padding-top:9px;border-top:1px solid var(--border-soft)}
  .folder-shortcuts{display:flex;flex-wrap:wrap;gap:6px;padding:3px 0 6px}
  .folder-shortcut{min-height:28px;padding:4px 9px;border:1px solid var(--border);border-radius:6px;background:var(--surface-2);color:var(--text-soft);font-size:var(--font-sm);font-weight:650}
  .folder-shortcut:hover:not(:disabled){background:var(--surface-3);color:var(--text)}
  .project-detail-actions{display:flex;justify-content:flex-end;padding:6px 0 2px}
  .pinned-label{color:var(--text-soft)}
  .more-menu{position:relative}
  .more-menu summary{width:30px;height:30px;display:grid;place-items:center;list-style:none;border-radius:6px;color:var(--muted);cursor:pointer}
  .more-menu summary:hover,.more-menu[open] summary{background:var(--surface-2);color:var(--text)}
  .more-menu summary::-webkit-details-marker{display:none}
  .menu-popover{position:absolute;z-index:20;right:0;top:34px;width:168px;display:grid;padding:5px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);box-shadow:var(--shadow-popover)}
  .menu-popover button{width:100%;padding:7px 8px;border-radius:5px;background:transparent;color:var(--text-soft);text-align:left;cursor:pointer;font-size:var(--font-sm)}
  .menu-popover button:hover:not(:disabled){background:var(--surface-3)}
</style>
