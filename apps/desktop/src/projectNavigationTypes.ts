export type ProjectNavigationModel = {
  id: string;
  name: string;
  active: boolean;
  open: boolean;
  dirty: boolean;
  exists: boolean;
};

export type ProjectNavigationFolder = {
  id: string;
  label: string;
  kind: 'models' | 'references' | 'textures' | 'exports';
};

export type ProjectNavigationProject = {
  id: string;
  name: string;
  active: boolean;
  pinned: boolean;
  model_count: number;
  models: ProjectNavigationModel[];
  folders: ProjectNavigationFolder[];
};

export type ActiveProjectNavigation = {
  project_id: string | null;
  project_name: string | null;
  model_id: string | null;
  model_name: string;
  saved: boolean;
  dirty: boolean;
};

export type ProjectNavigation = {
  revision: string | null;
  session_live: boolean;
  continue_model_id: string | null;
  active: ActiveProjectNavigation | null;
  projects: ProjectNavigationProject[];
};

export type ProjectAction =
  | 'open-project-folder'
  | 'open-folder'
  | 'reveal-model'
  | 'pin-project'
  | 'unpin-project';
