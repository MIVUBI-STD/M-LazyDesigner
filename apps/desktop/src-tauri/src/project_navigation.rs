use crate::blockbench;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    env,
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Debug, Serialize)]
pub struct ProjectNavigationModel {
    pub id: String,
    pub name: String,
    pub active: bool,
    pub open: bool,
    pub dirty: bool,
    pub exists: bool,
}

#[derive(Debug, Serialize)]
pub struct ProjectNavigationFolder {
    pub id: String,
    pub label: &'static str,
    pub kind: &'static str,
}

#[derive(Debug, Serialize)]
pub struct ProjectNavigationProject {
    pub id: String,
    pub name: String,
    pub active: bool,
    pub pinned: bool,
    pub model_count: usize,
    pub models: Vec<ProjectNavigationModel>,
    pub folders: Vec<ProjectNavigationFolder>,
}

#[derive(Debug, Serialize)]
pub struct ActiveProjectNavigation {
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub model_id: Option<String>,
    pub model_name: String,
    pub saved: bool,
    pub dirty: bool,
}

#[derive(Debug, Serialize)]
pub struct ProjectNavigation {
    pub revision: Option<String>,
    pub session_live: bool,
    pub continue_model_id: Option<String>,
    pub active: Option<ActiveProjectNavigation>,
    pub projects: Vec<ProjectNavigationProject>,
}

#[derive(Debug, Serialize)]
pub struct ProjectNavigationActionResult {
    pub status: &'static str,
}

#[derive(Debug, Serialize)]
pub struct ProjectPathResult {
    pub path: String,
}

#[derive(Debug, Deserialize)]
struct NavigationSnapshotActive {
    uuid: String,
    name: String,
    model_path: Option<String>,
    saved: bool,
    #[serde(default)]
    dirty: bool,
}

#[derive(Debug, Deserialize)]
struct NavigationSnapshotOpen {
    uuid: String,
    name: String,
    path: Option<String>,
    saved: bool,
    dirty: bool,
    active: bool,
}

#[derive(Debug, Deserialize)]
struct NavigationSnapshotRecent {
    name: String,
    path: String,
    #[allow(dead_code)]
    day: Option<f64>,
    #[allow(dead_code)]
    favorite: bool,
}

#[derive(Debug, Deserialize)]
struct NavigationSnapshot {
    schema: u8,
    #[allow(dead_code)]
    observed_at_unix_ms: u64,
    generation: String,
    profile_id: String,
    revision: u64,
    last_model_path: Option<String>,
    active: Option<NavigationSnapshotActive>,
    #[serde(default)]
    open_models: Vec<NavigationSnapshotOpen>,
    recent_models: Vec<NavigationSnapshotRecent>,
}

const PROJECT_MANIFEST_FILE: &str = ".lazydesigner-project.json";
const PROJECT_MANIFEST_SCHEMA: u8 = 1;
const PROJECT_MANIFEST_MAX_BYTES: u64 = 4 * 1024;

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct ProjectManifest {
    schema: u8,
    project_uuid: String,
    display_name: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum ProjectManifestState {
    Missing,
    LegacyMarker,
    Valid(ProjectManifest),
    Invalid,
}

#[derive(Debug, Clone)]
struct ProjectIdentity {
    id: String,
    name: String,
}

#[derive(Debug, Deserialize, Serialize, Default)]
struct ProjectNavigationPreferences {
    schema: u8,
    pinned_project_ids: Vec<String>,
}

fn valid_profile_id(value: &str) -> bool {
    value.len() == 32 && value.chars().all(|ch| ch.is_ascii_hexdigit())
}

fn observed_at_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(u64::MAX as u128) as u64
}

fn project_navigation_snapshot_path(profile_id: Option<&str>) -> Option<PathBuf> {
    let profile_id = profile_id?;
    env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|base| base.join("LazyDesigner").join("project-navigation").join(format!("{profile_id}.json")))
}


fn project_navigation_preferences_path() -> Option<PathBuf> {
    env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|base| base.join("LazyDesigner").join("project-preferences.json"))
}


fn valid_navigation_generation(value: &str) -> bool {
    if value.len() != 36 {
        return false;
    }
    value.chars().enumerate().all(|(index, ch)| {
        if matches!(index, 8 | 13 | 18 | 23) {
            ch == '-'
        } else {
            ch.is_ascii_hexdigit()
        }
    })
}

fn navigation_snapshot_is_valid(snapshot: &NavigationSnapshot, expected_profile_id: &str) -> bool {
    snapshot.schema == 4
        && valid_navigation_generation(&snapshot.generation)
        && valid_profile_id(&snapshot.profile_id)
        && snapshot.profile_id == expected_profile_id
        && snapshot.open_models.len() <= 64
        && snapshot.recent_models.len() <= 128
}

fn read_navigation_snapshot(profile_id: Option<&str>) -> Option<NavigationSnapshot> {
    let path = project_navigation_snapshot_path(profile_id)?;
    let metadata = fs::metadata(&path).ok()?;
    if metadata.len() == 0 || metadata.len() > 512 * 1024 {
        return None;
    }

    let expected_profile_id = profile_id?;
    let snapshot: NavigationSnapshot = serde_json::from_slice(&fs::read(path).ok()?).ok()?;
    navigation_snapshot_is_valid(&snapshot, expected_profile_id).then_some(snapshot)
}

fn read_project_navigation_preferences() -> ProjectNavigationPreferences {
    let Some(path) = project_navigation_preferences_path() else {
        return ProjectNavigationPreferences { schema: 1, pinned_project_ids: Vec::new() };
    };
    let Ok(metadata) = fs::metadata(&path) else {
        return ProjectNavigationPreferences { schema: 1, pinned_project_ids: Vec::new() };
    };
    if metadata.len() == 0 || metadata.len() > 64 * 1024 {
        return ProjectNavigationPreferences { schema: 1, pinned_project_ids: Vec::new() };
    }
    let Ok(bytes) = fs::read(path) else {
        return ProjectNavigationPreferences { schema: 1, pinned_project_ids: Vec::new() };
    };
    let Ok(mut value) = serde_json::from_slice::<ProjectNavigationPreferences>(&bytes) else {
        return ProjectNavigationPreferences { schema: 1, pinned_project_ids: Vec::new() };
    };
    if value.schema != 1 {
        return ProjectNavigationPreferences { schema: 1, pinned_project_ids: Vec::new() };
    }
    value.pinned_project_ids.retain(|id| {
        id.strip_prefix("project-")
            .map(|suffix| suffix.len() == 20 && suffix.chars().all(|ch| ch.is_ascii_hexdigit()))
            .unwrap_or(false)
    });
    value.pinned_project_ids.sort();
    value.pinned_project_ids.dedup();
    value
}

fn write_project_navigation_preferences(value: &ProjectNavigationPreferences) -> Result<(), String> {
    let path = project_navigation_preferences_path()
        .ok_or_else(|| "LOCALAPPDATA is unavailable.".to_string())?;
    let parent = path.parent()
        .ok_or_else(|| "Project preference directory is invalid.".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Unable to prepare project preferences: {error}"))?;
    let bytes = serde_json::to_vec(value)
        .map_err(|error| format!("Unable to encode project preferences: {error}"))?;
    if bytes.len() > 64 * 1024 {
        return Err("Project preferences exceed the bounded size.".to_string());
    }
    fs::write(&path, bytes)
        .map_err(|error| format!("Unable to write project preferences: {error}"))?;
    Ok(())
}

fn navigation_revision_token(snapshot: &NavigationSnapshot) -> String {
    format!("{}:{}:{}", snapshot.profile_id, snapshot.generation, snapshot.revision)
}

const PROJECT_SESSION_LEASE_TTL_MS: u64 = 30_000;

fn project_session_fresh(blockbench_running: bool, modified_unix_ms: u64, now_unix_ms: u64) -> bool {
    blockbench_running
        && now_unix_ms.saturating_sub(modified_unix_ms) <= PROJECT_SESSION_LEASE_TTL_MS
}

pub(crate) fn probe(blockbench_running: bool, profile_id: Option<&str>) -> (Option<String>, bool) {
    let Some(path) = project_navigation_snapshot_path(profile_id) else {
        return (None, false);
    };
    let Ok(metadata) = fs::metadata(&path) else {
        return (None, false);
    };
    let Some(snapshot) = read_navigation_snapshot(profile_id) else {
        return (None, false);
    };
    let revision = Some(navigation_revision_token(&snapshot));
    if !blockbench_running {
        return (revision, false);
    }
    let Ok(modified) = metadata.modified() else {
        return (revision, false);
    };
    let Ok(duration) = modified.duration_since(UNIX_EPOCH) else {
        return (revision, false);
    };
    let modified_unix_ms = duration.as_millis().min(u64::MAX as u128) as u64;
    (
        revision,
        project_session_fresh(true, modified_unix_ms, observed_at_unix_ms()),
    )
}

fn live_open_models(snapshot: &NavigationSnapshot, session_live: bool) -> &[NavigationSnapshotOpen] {
    if session_live {
        snapshot.open_models.as_slice()
    } else {
        &[]
    }
}

fn is_bbmodel_path(path: &Path) -> bool {
    path.is_absolute()
        && path.extension()
            .and_then(|value| value.to_str())
            .map(|value| value.eq_ignore_ascii_case("bbmodel"))
            .unwrap_or(false)
}

fn navigation_id(prefix: &str, path: &Path) -> String {
    use sha2::{Digest, Sha256};
    let normalized = path.to_string_lossy().replace('/', "\\").to_lowercase();
    let digest = format!("{:x}", Sha256::digest(normalized.as_bytes()));
    format!("{prefix}-{}", &digest[..20])
}

fn navigation_path_key(path: &Path) -> String {
    path.to_string_lossy().replace('/', "\\").trim_end_matches('\\').to_ascii_lowercase()
}

fn normalized_project_display_name(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.chars().count() > 128 || trimmed.chars().any(|ch| ch.is_control()) {
        return None;
    }
    Some(trimmed.to_string())
}

fn read_project_manifest_state(root: &Path) -> ProjectManifestState {
    let path = root.join(PROJECT_MANIFEST_FILE);
    let metadata = match fs::metadata(&path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return ProjectManifestState::Missing,
        Err(_) => return ProjectManifestState::Invalid,
    };
    if !metadata.is_file() || metadata.len() > PROJECT_MANIFEST_MAX_BYTES {
        return ProjectManifestState::Invalid;
    }
    let Ok(bytes) = fs::read(&path) else { return ProjectManifestState::Invalid; };
    if bytes.iter().all(|byte| byte.is_ascii_whitespace()) {
        return ProjectManifestState::LegacyMarker;
    }
    let Ok(mut manifest) = serde_json::from_slice::<ProjectManifest>(&bytes) else {
        return ProjectManifestState::Invalid;
    };
    let Some(display_name) = normalized_project_display_name(&manifest.display_name) else {
        return ProjectManifestState::Invalid;
    };
    if manifest.schema != PROJECT_MANIFEST_SCHEMA || !valid_navigation_generation(&manifest.project_uuid) {
        return ProjectManifestState::Invalid;
    }
    manifest.project_uuid = manifest.project_uuid.to_ascii_lowercase();
    manifest.display_name = display_name;
    ProjectManifestState::Valid(manifest)
}

fn stable_project_id(manifest: &ProjectManifest) -> String {
    use sha2::{Digest, Sha256};
    let digest = format!("{:x}", Sha256::digest(manifest.project_uuid.as_bytes()));
    format!("project-{}", &digest[..20])
}

fn project_identity_from_state(root: &Path, state: &ProjectManifestState, collisions: &HashSet<String>) -> ProjectIdentity {
    if let ProjectManifestState::Valid(manifest) = state {
        let id = stable_project_id(manifest);
        if !collisions.contains(&id) {
            return ProjectIdentity { id, name: manifest.display_name.clone() };
        }
    }
    ProjectIdentity { id: navigation_id("project", root), name: project_name(root) }
}

fn project_identity_map(snapshot: &NavigationSnapshot) -> HashMap<String, ProjectIdentity> {
    let mut roots: HashMap<String, PathBuf> = HashMap::new();
    let mut add = |raw: &str| {
        let path = PathBuf::from(raw);
        if let Some(root) = project_root_for_model(&path) {
            roots.entry(navigation_path_key(&root)).or_insert(root);
        }
    };
    if let Some(last) = snapshot.last_model_path.as_deref() { add(last); }
    if let Some(active) = snapshot.active.as_ref().and_then(|value| value.model_path.as_deref()) { add(active); }
    for open in &snapshot.open_models { if let Some(path) = open.path.as_deref() { add(path); } }
    for recent in &snapshot.recent_models { add(&recent.path); }

    let states: HashMap<String, ProjectManifestState> = roots.iter()
        .map(|(key, root)| (key.clone(), read_project_manifest_state(root)))
        .collect();
    let mut counts: HashMap<String, usize> = HashMap::new();
    for state in states.values() {
        if let ProjectManifestState::Valid(manifest) = state {
            *counts.entry(stable_project_id(manifest)).or_insert(0) += 1;
        }
    }
    let collisions: HashSet<String> = counts.into_iter()
        .filter_map(|(id, count)| (count > 1).then_some(id))
        .collect();
    roots.into_iter().filter_map(|(key, root)| {
        states.get(&key).map(|state| (key, project_identity_from_state(&root, state, &collisions)))
    }).collect()
}

fn generate_project_uuid() -> String {
    let mut bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let hex = format!("{:032x}", u128::from_be_bytes(bytes));
    format!("{}-{}-{}-{}-{}", &hex[0..8], &hex[8..12], &hex[12..16], &hex[16..20], &hex[20..32])
}

fn write_project_manifest(root: &Path, manifest: &ProjectManifest) -> Result<(), String> {
    if !root.is_dir() { return Err("Project folder is unavailable.".to_string()); }
    let mut bytes = serde_json::to_vec_pretty(manifest)
        .map_err(|error| format!("Unable to encode Project manifest: {error}"))?;
    bytes.push(b'\n');
    if bytes.len() > PROJECT_MANIFEST_MAX_BYTES as usize {
        return Err("Project manifest exceeds the bounded size.".to_string());
    }
    fs::write(root.join(PROJECT_MANIFEST_FILE), bytes)
        .map_err(|error| format!("Unable to write Project manifest: {error}"))
}

fn ensure_project_manifest_for_pin(root: &Path, occupied: &HashSet<String>) -> Result<String, String> {
    match read_project_manifest_state(root) {
        ProjectManifestState::Valid(manifest) => {
            let id = stable_project_id(&manifest);
            if occupied.contains(&id) {
                Err("Project identity is duplicated by another visible Project.".to_string())
            } else {
                Ok(id)
            }
        }
        ProjectManifestState::Invalid => Err("Project manifest is malformed or unsupported; LazyDesigner will not overwrite it.".to_string()),
        ProjectManifestState::Missing | ProjectManifestState::LegacyMarker => {
            for _ in 0..8 {
                let manifest = ProjectManifest {
                    schema: PROJECT_MANIFEST_SCHEMA,
                    project_uuid: generate_project_uuid(),
                    display_name: project_name(root),
                };
                let id = stable_project_id(&manifest);
                if occupied.contains(&id) { continue; }
                write_project_manifest(root, &manifest)?;
                return Ok(id);
            }
            Err("Unable to allocate a unique Project identity.".to_string())
        }
    }
}

fn project_root_for_model(path: &Path) -> Option<PathBuf> {
    if !is_bbmodel_path(path) {
        return None;
    }
    let parent = path.parent()?.to_path_buf();

    for candidate in parent.ancestors().take(4) {
        if candidate.join(PROJECT_MANIFEST_FILE).is_file() {
            return Some(candidate.to_path_buf());
        }
    }

    let conventional = parent
        .file_name()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("models") || value.eq_ignore_ascii_case("model"))
        .unwrap_or(false);
    if conventional {
        parent.parent().map(Path::to_path_buf).or(Some(parent))
    } else {
        Some(parent)
    }
}

fn project_name(root: &Path) -> String {
    root.file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("Project")
        .to_string()
}


fn working_folders(root: &Path) -> Vec<(PathBuf, &'static str, &'static str)> {
    let groups: [(&str, &str, &[&str]); 4] = [
        ("models", "Models", &["Models", "Model"]),
        ("references", "References", &["References", "Reference"]),
        ("textures", "Textures", &["Textures", "Texture"]),
        ("exports", "Exports", &["Exports", "Export"]),
    ];
    let mut result = Vec::new();
    for (kind, label, candidates) in groups {
        if let Some(path) = candidates.iter()
            .map(|name| root.join(name))
            .find(|path| path.is_dir())
        {
            result.push((path, label, kind));
        }
    }
    result
}

fn folder_projection(root: &Path) -> Vec<ProjectNavigationFolder> {
    working_folders(root)
        .into_iter()
        .map(|(path, label, kind)| ProjectNavigationFolder {
            id: navigation_id("folder", &path),
            label,
            kind,
        })
        .collect()
}

fn model_name(path: &Path, preferred: &str) -> String {
    if !preferred.trim().is_empty() {
        return preferred.trim().to_string();
    }
    path.file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("Model")
        .to_string()
}

fn navigation_paths(profile_id: Option<&str>) -> (
    HashMap<String, PathBuf>,
    HashMap<String, PathBuf>,
    HashMap<String, PathBuf>,
) {
    let Some(snapshot) = read_navigation_snapshot(profile_id) else {
        return (HashMap::new(), HashMap::new(), HashMap::new());
    };
    let identities = project_identity_map(&snapshot);
    let mut projects = HashMap::new();
    let mut models = HashMap::new();
    let mut folders = HashMap::new();
    let mut add = |raw: &str| {
        let path = PathBuf::from(raw);
        let Some(root) = project_root_for_model(&path) else { return; };
        let Some(identity) = identities.get(&navigation_path_key(&root)) else { return; };
        projects.entry(identity.id.clone()).or_insert(root.clone());
        models.entry(navigation_id("model", &path)).or_insert(path);
        for (folder, _, _) in working_folders(&root) {
            folders.entry(navigation_id("folder", &folder)).or_insert(folder);
        }
    };
    if let Some(last) = snapshot.last_model_path.as_deref() { add(last); }
    if let Some(active) = snapshot.active.as_ref().and_then(|value| value.model_path.as_deref()) { add(active); }
    for open in &snapshot.open_models { if let Some(path) = open.path.as_deref() { add(path); } }
    for recent in &snapshot.recent_models { add(&recent.path); }
    (projects, models, folders)
}

fn continue_model_id_for_path(raw: Option<&str>) -> Option<String> {
    let path = PathBuf::from(raw?);
    if !is_bbmodel_path(&path) || !path.is_file() {
        return None;
    }
    Some(navigation_id("model", &path))
}

pub(crate) fn projection(session_live: bool, profile_id: Option<&str>) -> ProjectNavigation {
    let pinned: HashSet<String> = read_project_navigation_preferences()
        .pinned_project_ids
        .into_iter()
        .collect();
    let Some(snapshot) = read_navigation_snapshot(profile_id) else {
        return ProjectNavigation { revision: None, session_live: false, continue_model_id: None, active: None, projects: Vec::new() };
    };
    let revision = Some(navigation_revision_token(&snapshot));
    let continue_model_id = continue_model_id_for_path(snapshot.last_model_path.as_deref());
    let identities = project_identity_map(&snapshot);

    let active_path = if session_live {
        snapshot.active.as_ref()
            .and_then(|value| value.model_path.as_ref())
            .map(PathBuf::from)
            .filter(|path| is_bbmodel_path(path))
    } else {
        None
    };
    let active_model_id = active_path.as_ref().map(|path| navigation_id("model", path));
    let active_project_root = active_path.as_ref().and_then(|path| project_root_for_model(path));
    let active_project_identity = active_project_root.as_ref()
        .and_then(|root| identities.get(&navigation_path_key(root)));
    let active_project_id = active_project_identity.map(|identity| identity.id.clone());

    let active = if session_live {
        snapshot.active.as_ref().map(|value| ActiveProjectNavigation {
            project_id: active_project_id.clone(),
            project_name: active_project_identity.map(|identity| identity.name.clone()),
            model_id: active_model_id.clone(),
            model_name: if let Some(path) = active_path.as_ref() {
                model_name(path, &value.name)
            } else if value.name.trim().is_empty() {
                "Untitled Project".to_string()
            } else {
                value.name.trim().to_string()
            },
            saved: value.saved && active_path.is_some(),
            dirty: value.dirty,
        })
    } else {
        None
    };

    let live_open_models = live_open_models(&snapshot, session_live);
    let open_by_path: HashMap<String, (bool, bool)> = live_open_models.iter()
        .filter_map(|model| {
            let path = model.path.as_ref()?;
            let path = PathBuf::from(path);
            if !is_bbmodel_path(&path) {
                return None;
            }
            let key = navigation_path_key(&path);
            Some((key, (model.active, model.dirty)))
        })
        .collect();

    let mut projects: Vec<ProjectNavigationProject> = Vec::new();
    let mut add_model = |path: PathBuf, preferred: &str, active_model: bool| {
        let Some(root) = project_root_for_model(&path) else { return; };
        let Some(identity) = identities.get(&navigation_path_key(&root)) else { return; };
        let project_id = identity.id.clone();
        let legacy_project_id = navigation_id("project", &root);
        let model_id = navigation_id("model", &path);
        let project_active = active_project_id.as_deref() == Some(project_id.as_str());
        let path_key = navigation_path_key(&path);
        let (open, dirty) = open_by_path.get(&path_key).copied().unwrap_or((false, false));

        let index = projects.iter().position(|project| project.id == project_id)
            .unwrap_or_else(|| {
                projects.push(ProjectNavigationProject {
                    id: project_id.clone(),
                    name: identity.name.clone(),
                    active: project_active,
                    pinned: pinned.contains(&project_id) || pinned.contains(&legacy_project_id),
                    model_count: 0,
                    models: Vec::new(),
                    folders: folder_projection(&root),
                });
                projects.len() - 1
            });
        let project = &mut projects[index];
        project.active |= project_active;
        if project.models.iter().any(|model| model.id == model_id) {
            if let Some(model) = project.models.iter_mut().find(|model| model.id == model_id) {
                model.active |= active_model || open_by_path.get(&path_key).map(|state| state.0).unwrap_or(false);
                model.open |= open;
                model.dirty |= dirty;
            }
            return;
        }
        project.models.push(ProjectNavigationModel {
            id: model_id,
            name: model_name(&path, preferred),
            active: active_model || open_by_path.get(&path_key).map(|state| state.0).unwrap_or(false),
            open,
            dirty,
            exists: path.is_file(),
        });
        project.model_count = project.models.len();
    };

    if let Some(last) = snapshot.last_model_path.as_deref() {
        add_model(PathBuf::from(last), "", false);
    }
    if let (Some(path), Some(active_snapshot)) = (active_path.clone(), snapshot.active.as_ref()) {
        add_model(path, &active_snapshot.name, true);
    }
    for open in live_open_models {
        let Some(raw_path) = open.path.as_ref() else { continue; };
        let path = PathBuf::from(raw_path);
        if !is_bbmodel_path(&path) {
            continue;
        }
        add_model(path, &open.name, open.active);
    }
    for recent in snapshot.recent_models {
        let path = PathBuf::from(&recent.path);
        let model_id = navigation_id("model", &path);
        let is_active = active_model_id.as_deref() == Some(model_id.as_str());
        add_model(path, &recent.name, is_active);
    }

    projects.sort_by_key(|project| {
        if project.active { 0 } else if project.pinned { 1 } else { 2 }
    });
    ProjectNavigation { revision, session_live, continue_model_id, active, projects }
}

pub(crate) fn action(action: &str, id: &str, profile_id: Option<&str>) -> Result<ProjectNavigationActionResult, String> {
    let (projects, models, folders) = navigation_paths(profile_id);
    match action {
        "open-project-folder" => {
            let path = projects.get(id).ok_or_else(|| "Project is no longer available.".to_string())?;
            if !path.is_dir() {
                return Err("Project folder is unavailable.".to_string());
            }
            Command::new("explorer.exe")
                .arg(path)
                .spawn()
                .map_err(|error| format!("Unable to open the project folder: {error}"))?;
            Ok(ProjectNavigationActionResult { status: "OPENED" })
        }
        "pin-project" | "unpin-project" => {
            let root = projects.get(id).ok_or_else(|| "Project is no longer available.".to_string())?;
            let legacy_id = navigation_id("project", root);
            let current_stable_id = match read_project_manifest_state(root) {
                ProjectManifestState::Valid(manifest) => Some(stable_project_id(&manifest)),
                _ => None,
            };
            let mut preferences = read_project_navigation_preferences();
            preferences.schema = 1;
            preferences.pinned_project_ids.retain(|candidate| {
                candidate != id && candidate != &legacy_id && current_stable_id.as_deref() != Some(candidate.as_str())
            });
            let pin = action == "pin-project";
            if pin {
                let root_key = navigation_path_key(root);
                let occupied: HashSet<String> = projects.values()
                    .filter(|candidate| navigation_path_key(candidate) != root_key)
                    .filter_map(|candidate| match read_project_manifest_state(candidate) {
                        ProjectManifestState::Valid(manifest) => Some(stable_project_id(&manifest)),
                        _ => None,
                    }).collect();
                preferences.pinned_project_ids.push(ensure_project_manifest_for_pin(root, &occupied)?);
            }
            preferences.pinned_project_ids.sort();
            preferences.pinned_project_ids.dedup();
            write_project_navigation_preferences(&preferences)?;
            Ok(ProjectNavigationActionResult { status: if pin { "PINNED" } else { "UNPINNED" } })
        }
        "open-folder" => {
            let path = folders.get(id).ok_or_else(|| "Folder is no longer available.".to_string())?;
            if !path.is_dir() {
                return Err("Folder is unavailable.".to_string());
            }
            Command::new("explorer.exe")
                .arg(path)
                .spawn()
                .map_err(|error| format!("Unable to open the project folder: {error}"))?;
            Ok(ProjectNavigationActionResult { status: "OPENED" })
        }
        "reveal-model" => {
            let path = models.get(id).ok_or_else(|| "Model is no longer available.".to_string())?;
            if !path.is_file() {
                return Err("Model file is unavailable.".to_string());
            }
            Command::new("explorer.exe")
                .arg("/select,")
                .arg(path)
                .spawn()
                .map_err(|error| format!("Unable to reveal the model file: {error}"))?;
            Ok(ProjectNavigationActionResult { status: "REVEALED" })
        }
        "open-model" => {
            let path = models.get(id).ok_or_else(|| "Model is no longer available.".to_string())?;
            blockbench::open_model(path)?;
            Ok(ProjectNavigationActionResult { status: "OPENED" })
        }
        _ => Err("Unsupported project navigation action.".to_string()),
    }
}

pub(crate) fn path(id: &str, profile_id: Option<&str>) -> Result<ProjectPathResult, String> {
    let (projects, models, folders) = navigation_paths(profile_id);
    let path = models.get(id).or_else(|| projects.get(id)).or_else(|| folders.get(id))
        .ok_or_else(|| "Project or model is no longer available.".to_string())?;
    Ok(ProjectPathResult { path: path.display().to_string() })
}


#[cfg(test)]
mod tests {
    use super::*;

    fn temp_project(label: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("lazydesigner-{label}-{}-{}", std::process::id(), generate_project_uuid()));
        fs::create_dir_all(&path).unwrap();
        path
    }

    fn fixed_manifest(name: &str) -> ProjectManifest {
        ProjectManifest {
            schema: PROJECT_MANIFEST_SCHEMA,
            project_uuid: "11111111-2222-4333-8444-555555555555".to_string(),
            display_name: name.to_string(),
        }
    }

    #[test]
    fn continue_model_requires_the_exact_last_saved_model_to_exist() {
        let path = std::env::temp_dir().join(format!(
            "lazydesigner-continue-{}-{}.bbmodel",
            std::process::id(),
            observed_at_unix_ms()
        ));
        fs::write(&path, b"{}").unwrap();
        let raw = path.to_string_lossy().to_string();

        let resolved = continue_model_id_for_path(Some(&raw));
        assert!(resolved.as_deref().unwrap_or("").starts_with("model-"));

        fs::remove_file(&path).unwrap();
        assert!(continue_model_id_for_path(Some(&raw)).is_none());
        assert!(continue_model_id_for_path(Some("C:/Projects/not-a-model.txt")).is_none());
        assert!(continue_model_id_for_path(None).is_none());
    }

    #[test]
    fn manifest_identity_survives_project_move() {
        let base = temp_project("move");
        let before = base.join("Before");
        let after = base.join("After");
        fs::create_dir_all(&before).unwrap();
        write_project_manifest(&before, &fixed_manifest("Furniture")).unwrap();
        let first = project_identity_from_state(&before, &read_project_manifest_state(&before), &HashSet::new());
        fs::rename(&before, &after).unwrap();
        let second = project_identity_from_state(&after, &read_project_manifest_state(&after), &HashSet::new());
        assert_eq!(first.id, second.id);
        assert_eq!(second.name, "Furniture");
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn malformed_or_unsupported_manifest_is_not_overwritten() {
        let root = temp_project("invalid");
        let path = root.join(PROJECT_MANIFEST_FILE);
        let raw = br#"{"schema":2,"project_uuid":"11111111-2222-4333-8444-555555555555","display_name":"Future"}"#;
        fs::write(&path, raw).unwrap();
        assert_eq!(read_project_manifest_state(&root), ProjectManifestState::Invalid);
        assert!(ensure_project_manifest_for_pin(&root, &HashSet::new()).is_err());
        assert_eq!(fs::read(&path).unwrap(), raw);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn duplicate_manifest_ids_fall_back_to_distinct_path_ids() {
        let base = temp_project("collision");
        let one = base.join("One");
        let two = base.join("Two");
        fs::create_dir_all(&one).unwrap();
        fs::create_dir_all(&two).unwrap();
        let manifest = fixed_manifest("Furniture");
        write_project_manifest(&one, &manifest).unwrap();
        write_project_manifest(&two, &manifest).unwrap();
        let collision = HashSet::from([stable_project_id(&manifest)]);
        let a = project_identity_from_state(&one, &read_project_manifest_state(&one), &collision);
        let b = project_identity_from_state(&two, &read_project_manifest_state(&two), &collision);
        assert_ne!(a.id, b.id);
        assert!(ensure_project_manifest_for_pin(&one, &collision).is_err());
        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn pin_upgrades_empty_legacy_marker() {
        let root = temp_project("legacy");
        fs::write(root.join(PROJECT_MANIFEST_FILE), b" \n").unwrap();
        assert_eq!(read_project_manifest_state(&root), ProjectManifestState::LegacyMarker);
        let id = ensure_project_manifest_for_pin(&root, &HashSet::new()).unwrap();
        let ProjectManifestState::Valid(manifest) = read_project_manifest_state(&root) else { panic!("manifest not upgraded"); };
        assert_eq!(id, stable_project_id(&manifest));
        assert!(valid_navigation_generation(&manifest.project_uuid));
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn project_grouping_prefers_manifest_then_models_folder_then_direct_parent() {
        let base = temp_project("grouping");
        let manifest_root = base.join("ManifestProject");
        let nested = manifest_root.join("Deep").join("Models");
        fs::create_dir_all(&nested).unwrap();
        write_project_manifest(&manifest_root, &fixed_manifest("Manifest Project")).unwrap();
        let manifest_model = nested.join("Chair.bbmodel");
        fs::write(&manifest_model, b"{}").unwrap();
        assert_eq!(project_root_for_model(&manifest_model), Some(manifest_root.clone()));

        let conventional_root = base.join("Furniture");
        let models = conventional_root.join("Models");
        fs::create_dir_all(&models).unwrap();
        let sofa = models.join("Sofa.bbmodel");
        fs::write(&sofa, b"{}").unwrap();
        assert_eq!(project_root_for_model(&sofa), Some(conventional_root.clone()));

        let direct_root = base.join("Loose");
        fs::create_dir_all(&direct_root).unwrap();
        let prop = direct_root.join("Prop.bbmodel");
        fs::write(&prop, b"{}").unwrap();
        assert_eq!(project_root_for_model(&prop), Some(direct_root.clone()));

        fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn two_models_in_one_project_share_project_identity_but_keep_model_identity() {
        let base = temp_project("multi-model");
        let root = base.join("Furniture");
        let models = root.join("Models");
        fs::create_dir_all(&models).unwrap();
        write_project_manifest(&root, &fixed_manifest("Furniture")).unwrap();
        let chair = models.join("Chair.bbmodel");
        let sofa = models.join("Sofa.bbmodel");
        fs::write(&chair, b"{}").unwrap();
        fs::write(&sofa, b"{}").unwrap();

        let snapshot = NavigationSnapshot {
            schema: 4,
            observed_at_unix_ms: 1,
            generation: "11111111-1111-4111-8111-111111111111".to_string(),
            profile_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_string(),
            revision: 1,
            last_model_path: Some(chair.to_string_lossy().to_string()),
            active: None,
            open_models: Vec::new(),
            recent_models: vec![
                NavigationSnapshotRecent {
                    name: "Chair".to_string(),
                    path: chair.to_string_lossy().to_string(),
                    day: None,
                    favorite: false,
                },
                NavigationSnapshotRecent {
                    name: "Sofa".to_string(),
                    path: sofa.to_string_lossy().to_string(),
                    day: None,
                    favorite: false,
                },
            ],
        };
        let identities = project_identity_map(&snapshot);
        assert_eq!(identities.len(), 1);
        let identity = identities.values().next().unwrap();
        assert_eq!(identity.id, stable_project_id(&fixed_manifest("Furniture")));
        assert_ne!(navigation_id("model", &chair), navigation_id("model", &sofa));
        fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn save_as_changes_model_identity_without_changing_manifest_project_identity() {
        let base = temp_project("save-as");
        let root = base.join("Furniture");
        fs::create_dir_all(&root).unwrap();
        let manifest = fixed_manifest("Furniture");
        write_project_manifest(&root, &manifest).unwrap();
        let before = root.join("Chair.bbmodel");
        let after = root.join("Chair Copy.bbmodel");
        fs::write(&before, b"{}").unwrap();
        fs::write(&after, b"{}").unwrap();

        let state = read_project_manifest_state(&root);
        let project = project_identity_from_state(&root, &state, &HashSet::new());
        assert_eq!(project.id, stable_project_id(&manifest));
        assert_ne!(navigation_id("model", &before), navigation_id("model", &after));
        assert_eq!(project_root_for_model(&before), project_root_for_model(&after));
        fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn navigation_snapshot_bounds_accept_64_open_and_128_recent_only() {
        let make = |open_count: usize, recent_count: usize| NavigationSnapshot {
            schema: 4,
            observed_at_unix_ms: 1,
            generation: "11111111-1111-4111-8111-111111111111".to_string(),
            profile_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_string(),
            revision: 1,
            last_model_path: None,
            active: None,
            open_models: (0..open_count).map(|index| NavigationSnapshotOpen {
                uuid: format!("open-{index}"),
                name: format!("Model {index}"),
                path: None,
                saved: true,
                dirty: false,
                active: false,
            }).collect(),
            recent_models: (0..recent_count).map(|index| NavigationSnapshotRecent {
                name: format!("Recent {index}"),
                path: format!("C:/Project/{index}.bbmodel"),
                day: None,
                favorite: false,
            }).collect(),
        };
        let profile = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        assert!(navigation_snapshot_is_valid(&make(64, 128), profile));
        assert!(!navigation_snapshot_is_valid(&make(65, 128), profile));
        assert!(!navigation_snapshot_is_valid(&make(64, 129), profile));
    }

    #[test]
    fn navigation_generation_validation_is_bounded() {
        assert!(valid_navigation_generation("11111111-1111-4111-8111-111111111111"));
        assert!(!valid_navigation_generation("not-a-generation"));
        assert!(!valid_navigation_generation("111111111111411181111111111111111111"));
    }

    #[test]
    fn project_session_lease_requires_live_blockbench_and_fresh_snapshot() {
        let now = 100_000;
        assert!(project_session_fresh(true, now - 5_000, now));
        assert!(!project_session_fresh(false, now - 5_000, now));
        assert!(!project_session_fresh(true, now - PROJECT_SESSION_LEASE_TTL_MS - 1, now));
    }

    #[test]
    fn project_navigation_revision_is_generation_aware() {
        let make = |generation: &str| NavigationSnapshot {
            schema: 4,
            observed_at_unix_ms: 1,
            generation: generation.to_string(),
            profile_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_string(),
            revision: 1,
            last_model_path: None,
            active: None,
            open_models: Vec::new(),
            recent_models: Vec::new(),
        };
        let first = make("11111111-1111-4111-8111-111111111111");
        let second = make("22222222-2222-4222-8222-222222222222");
        assert_ne!(navigation_revision_token(&first), navigation_revision_token(&second));
    }

    #[test]
    fn project_navigation_revision_is_profile_aware() {
        let make = |profile_id: &str| NavigationSnapshot {
            schema: 4,
            observed_at_unix_ms: 1,
            generation: "11111111-1111-4111-8111-111111111111".to_string(),
            profile_id: profile_id.to_string(),
            revision: 1,
            last_model_path: None,
            active: None,
            open_models: Vec::new(),
            recent_models: Vec::new(),
        };
        let first = make("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        let second = make("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
        assert_ne!(navigation_revision_token(&first), navigation_revision_token(&second));
    }

    #[test]
    fn live_project_session_state_is_discarded_when_session_is_not_live() {
        let snapshot = NavigationSnapshot {
            schema: 4,
            observed_at_unix_ms: 1,
            generation: "11111111-1111-4111-8111-111111111111".to_string(),
            profile_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_string(),
            revision: 7,
            last_model_path: None,
            active: None,
            open_models: vec![NavigationSnapshotOpen {
                uuid: "open-model".to_string(),
                name: "Sofa".to_string(),
                path: Some("C:/Projects/Furniture/Sofa.bbmodel".to_string()),
                saved: true,
                dirty: true,
                active: true,
            }],
            recent_models: Vec::new(),
        };

        assert_eq!(live_open_models(&snapshot, true).len(), 1);
        assert!(live_open_models(&snapshot, false).is_empty());
    }


}
