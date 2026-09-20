use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    env,
    fs,
    path::{Path, PathBuf},
    collections::{HashMap, HashSet},
    process::Command,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use crate::{
    blockbench::{self, BlockbenchState},
    process::{run_output, run_output_with_stderr_lines},
};
use sysinfo::{Pid, System};
use tauri::{path::BaseDirectory, AppHandle, Emitter, Manager};

#[derive(Debug, Deserialize, Serialize)]
pub struct ManagedInstalled {
    pub source_sha: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ManagedRollback { pub available: bool, pub previous_source_sha: Option<String>, pub transaction: Option<String> }

#[derive(Debug, Deserialize, Serialize)]
pub struct ManagedStatus {
    pub schema: u8,
    pub installed: Option<ManagedInstalled>,
    pub pending: bool,
    pub gateway_active: bool,
    pub runtime_online: bool,
    #[serde(default = "default_runtime_url")]
    pub runtime_url: String,
    pub tls_ready: bool,
    pub tls_error: Option<String>,
    #[serde(default)]
    pub rollback: Option<ManagedRollback>,
}

fn default_runtime_url() -> String {
    "https://127.0.0.1:3000/bb-mcp".to_string()
}

#[derive(Debug, Serialize)]
pub struct MaintenanceAvailability {
    pub update: bool,
    pub rollback: bool,
    pub repair: bool,
    pub recover: bool,
    pub setup_tls: bool,
    pub blocked_reason: Option<&'static str>,
}

#[derive(Debug, Serialize)]
pub struct GatewaySupervision {
    pub ownership: &'static str,
    pub state: &'static str,
    pub action: Option<&'static str>,
}

#[derive(Debug, Serialize)]
pub struct PluginFileActionResult {
    pub status: &'static str,
}

#[derive(Debug, Serialize)]
pub struct BootstrapActionResult {
    pub action: &'static str,
    pub receipt: Value,
}

#[derive(Debug, Serialize)]
pub struct ManagedActionResult {
    pub action: String,
    pub receipt: Value,
}

#[derive(Debug, Serialize)]
pub struct EnsureReadyResult {
    pub status: &'static str,
    pub reason: &'static str,
    pub runtime_online: bool,
    pub gateway_active: bool,
    pub blockbench_running: bool,
    pub plugin_integrity: &'static str,
    pub manual_plugin_approval_recommended: bool,
}
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ManagedProgressEvent { pub schema: u8, pub kind: String, pub action: String, pub stage: String }

#[derive(Debug, Serialize)]
pub struct ReadinessProjection {
    pub state: &'static str,
    pub summary: &'static str,
    pub ready: bool,
}

#[derive(Debug, Serialize)]
pub struct ConnectionStatus {
    pub schema: u8,
    pub observed_at_unix_ms: u64,
    pub blockbench_running: bool,
    pub runtime_listener_live: bool,
    pub gateway_active: Option<bool>,
    pub plugin_integrity: &'static str,
    pub project_revision: Option<String>,
    pub project_session_live: bool,
}

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

#[derive(Debug, Serialize)]
pub struct SystemStatus {
    pub schema: u8,
    pub product_state: &'static str,
    pub plugin_integrity: &'static str,
    pub observed_at_unix_ms: u64,
    pub readiness: ReadinessProjection,
    pub blockbench: BlockbenchState,
    pub gateway: GatewaySupervision,
    pub maintenance: MaintenanceAvailability,
    pub manager_available: bool,
    pub bootstrap_available: bool,
    pub runtime_listener_live: bool,
    pub runtime_endpoint_match: Option<bool>,
    pub runtime_ready: bool,
    pub managed: Option<ManagedStatus>,
    pub project_navigation: ProjectNavigation,
    pub diagnostic: Option<String>,
}

#[derive(Debug, Deserialize)]
struct InstalledOptions {
    plugin: PathBuf,
}

#[derive(Debug, Deserialize)]
struct InstalledState {
    source_sha: String,
    options: InstalledOptions,
    owned: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct RuntimeSessionLease {
    schema: u8,
    profile_id: String,
    producer_pid: u32,
    instance_id: String,
    runtime_url: String,
    #[allow(dead_code)]
    started_at_unix_ms: u64,
}

#[derive(Debug)]
struct RuntimeSessionProbe {
    live: bool,
    runtime_url: Option<String>,
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

fn managed_root() -> Option<PathBuf> {
    env::var_os("BLOCKIT_HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("LOCALAPPDATA").map(|base| PathBuf::from(base).join("BlockIT")))
}


fn normalize_navigation_profile_path(path: &Path) -> String {
    path.to_string_lossy()
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_ascii_lowercase()
}

fn navigation_profile_id(path: &Path) -> String {
    use sha2::{Digest, Sha256};
    let digest = format!("{:x}", Sha256::digest(normalize_navigation_profile_path(path).as_bytes()));
    digest[..32].to_string()
}

fn valid_navigation_profile_id(value: &str) -> bool {
    value.len() == 32 && value.chars().all(|ch| ch.is_ascii_hexdigit())
}

fn managed_blockbench_user_data_dir() -> Option<PathBuf> {
    let root = managed_root()?;
    let bytes = fs::read(root.join("installed.json")).ok()?;
    let installed: InstalledState = serde_json::from_slice(&bytes).ok()?;
    let plugin = installed.options.plugin;
    if plugin.file_name().and_then(|name| name.to_str()) != Some("blockit_mcp.js") {
        return None;
    }
    let plugins_dir = plugin.parent()?;
    if !plugins_dir
        .file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.eq_ignore_ascii_case("plugins"))
        .unwrap_or(false)
    {
        return None;
    }
    let user_data = plugins_dir.parent()?.to_path_buf();
    if !user_data.is_absolute() {
        return None;
    }
    Some(user_data)
}

fn managed_navigation_profile_id() -> Option<String> {
    managed_blockbench_user_data_dir().map(|path| navigation_profile_id(&path))
}

fn project_navigation_snapshot_path() -> Option<PathBuf> {
    let profile_id = managed_navigation_profile_id()?;
    env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|base| base.join("LazyDesigner").join("project-navigation").join(format!("{profile_id}.json")))
}


fn runtime_session_lease_path() -> Option<PathBuf> {
    let profile_id = managed_navigation_profile_id()?;
    env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|base| base.join("LazyDesigner").join("runtime-session").join(format!("{profile_id}.json")))
}

const RUNTIME_SESSION_LEASE_TTL_MS: u64 = 15_000;

fn runtime_endpoint_identity(value: &str) -> Option<(u16, String)> {
    if value.len() > 512 || value.chars().any(|ch| matches!(ch, '\r' | '\n' | '\t')) {
        return None;
    }
    let suffix = value
        .strip_prefix("https://127.0.0.1")
        .or_else(|| value.strip_prefix("https://localhost"))
        .or_else(|| value.strip_prefix("https://[::1]"))?;

    let (port, path) = if let Some(rest) = suffix.strip_prefix(':') {
        let (raw_port, path) = match rest.split_once('/') {
            Some((raw_port, path)) => (raw_port, format!("/{path}")),
            None => (rest, "/".to_string()),
        };
        let port = raw_port.parse::<u16>().ok()?;
        if port == 0 {
            return None;
        }
        (port, path)
    } else if suffix.is_empty() {
        (443, "/".to_string())
    } else if suffix.starts_with('/') {
        (443, suffix.to_string())
    } else {
        return None;
    };

    let normalized_path = if path.len() > 1 {
        path.trim_end_matches('/').to_string()
    } else {
        path
    };
    if normalized_path.is_empty() || normalized_path.chars().any(|ch| matches!(ch, '?' | '#')) {
        return None;
    }
    Some((port, normalized_path))
}

fn valid_runtime_session_url(value: &str) -> bool {
    runtime_endpoint_identity(value).is_some()
}

fn runtime_session_probe(blockbench_running: bool, system: &System) -> RuntimeSessionProbe {
    if !blockbench_running {
        return RuntimeSessionProbe { live: false, runtime_url: None };
    }
    let Some(path) = runtime_session_lease_path() else {
        return RuntimeSessionProbe { live: false, runtime_url: None };
    };
    let Ok(metadata) = fs::metadata(&path) else {
        return RuntimeSessionProbe { live: false, runtime_url: None };
    };
    if metadata.len() == 0 || metadata.len() > 16 * 1024 {
        return RuntimeSessionProbe { live: false, runtime_url: None };
    }
    let Some(expected_profile_id) = managed_navigation_profile_id() else {
        return RuntimeSessionProbe { live: false, runtime_url: None };
    };
    let Ok(bytes) = fs::read(&path) else {
        return RuntimeSessionProbe { live: false, runtime_url: None };
    };
    let Ok(lease) = serde_json::from_slice::<RuntimeSessionLease>(&bytes) else {
        return RuntimeSessionProbe { live: false, runtime_url: None };
    };
    if lease.schema != 1
        || lease.profile_id != expected_profile_id
        || !valid_navigation_profile_id(&lease.profile_id)
        || !valid_navigation_generation(&lease.instance_id)
        || !valid_runtime_session_url(&lease.runtime_url)
    {
        return RuntimeSessionProbe { live: false, runtime_url: None };
    }
    let Some(process) = system.process(Pid::from_u32(lease.producer_pid)) else {
        return RuntimeSessionProbe { live: false, runtime_url: Some(lease.runtime_url) };
    };
    let name = process.name().to_ascii_lowercase();
    if name != "blockbench.exe" && name != "blockbench" {
        return RuntimeSessionProbe { live: false, runtime_url: Some(lease.runtime_url) };
    }
    let Ok(modified) = metadata.modified() else {
        return RuntimeSessionProbe { live: false, runtime_url: Some(lease.runtime_url) };
    };
    let Ok(age) = SystemTime::now().duration_since(modified) else {
        return RuntimeSessionProbe { live: false, runtime_url: Some(lease.runtime_url) };
    };
    RuntimeSessionProbe {
        live: age.as_millis() <= RUNTIME_SESSION_LEASE_TTL_MS as u128,
        runtime_url: Some(lease.runtime_url),
    }
}

fn runtime_endpoint_match(managed: Option<&ManagedStatus>, probe: &RuntimeSessionProbe) -> Option<bool> {
    let managed = managed?;
    let listener = runtime_endpoint_identity(probe.runtime_url.as_deref()?)?;
    Some(runtime_endpoint_identity(&managed.runtime_url) == Some(listener))
}

fn runtime_ready(managed: Option<&ManagedStatus>, probe: &RuntimeSessionProbe) -> bool {
    probe.live
        && runtime_endpoint_match(managed, probe) == Some(true)
        && managed.map(|value| value.runtime_online).unwrap_or(false)
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
        && valid_navigation_profile_id(&snapshot.profile_id)
        && snapshot.profile_id == expected_profile_id
        && snapshot.open_models.len() <= 64
        && snapshot.recent_models.len() <= 128
}

fn read_navigation_snapshot() -> Option<NavigationSnapshot> {
    let path = project_navigation_snapshot_path()?;
    let metadata = fs::metadata(&path).ok()?;
    if metadata.len() == 0 || metadata.len() > 512 * 1024 {
        return None;
    }

    let expected_profile_id = managed_navigation_profile_id()?;
    let snapshot: NavigationSnapshot = serde_json::from_slice(&fs::read(path).ok()?).ok()?;
    navigation_snapshot_is_valid(&snapshot, &expected_profile_id).then_some(snapshot)
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

fn project_navigation_probe(blockbench_running: bool) -> (Option<String>, bool) {
    let Some(path) = project_navigation_snapshot_path() else {
        return (None, false);
    };
    let Ok(metadata) = fs::metadata(&path) else {
        return (None, false);
    };
    let Some(snapshot) = read_navigation_snapshot() else {
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

fn navigation_paths() -> (
    HashMap<String, PathBuf>,
    HashMap<String, PathBuf>,
    HashMap<String, PathBuf>,
) {
    let Some(snapshot) = read_navigation_snapshot() else {
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

fn project_navigation_projection(session_live: bool) -> ProjectNavigation {
    let pinned: HashSet<String> = read_project_navigation_preferences()
        .pinned_project_ids
        .into_iter()
        .collect();
    let Some(snapshot) = read_navigation_snapshot() else {
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

pub fn project_navigation_action(action: &str, id: &str) -> Result<ProjectNavigationActionResult, String> {
    let (projects, models, folders) = navigation_paths();
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

pub fn project_navigation_path(id: &str) -> Result<ProjectPathResult, String> {
    let (projects, models, folders) = navigation_paths();
    let path = models.get(id).or_else(|| projects.get(id)).or_else(|| folders.get(id))
        .ok_or_else(|| "Project or model is no longer available.".to_string())?;
    Ok(ProjectPathResult { path: path.display().to_string() })
}


fn blockbench_user_data_dir() -> Result<PathBuf, String> {
    let script = r#"
if (!$env:APPDATA) { exit 2 }
$defaultPath = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'Blockbench'))
$processes = @(
  Get-CimInstance Win32_Process -Filter "Name='Blockbench.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.ExecutablePath -and
      (Test-Path -LiteralPath $_.ExecutablePath -PathType Leaf) -and
      ((Get-Item -LiteralPath $_.ExecutablePath).VersionInfo.ProductName -eq 'Blockbench')
    }
)
$paths = @()
foreach ($process in $processes) {
  if (!$process.CommandLine) { exit 3 }
  $match = [regex]::Match([string]$process.CommandLine, '(?i)(?:^|\s)--userData\s+(?:"([^"]+)"|(\S+))')
  if ($match.Success) {
    $value = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
    if (![IO.Path]::IsPathRooted($value)) { exit 4 }
    $paths += [IO.Path]::GetFullPath($value)
  } else {
    $paths += $defaultPath
  }
}
$distinct = @($paths | Sort-Object -Unique)
if ($distinct.Count -gt 1) { exit 5 }
if ($distinct.Count -eq 1) {
  [Console]::Out.WriteLine($distinct[0])
  exit 0
}
[Console]::Out.WriteLine($defaultPath)
"#;

    let output = run_output(
        Command::new("powershell.exe")
            .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script]),
        Duration::from_secs(8),
        "Blockbench userData discovery",
    )?;

    if !output.status.success() {
        return Err(match output.status.code() {
            Some(3) => "Blockbench is running but its command line is unavailable; close Blockbench or run Desktop with sufficient access before first installation.".to_string(),
            Some(4) => "Blockbench --userData must be an absolute path for managed plugin installation.".to_string(),
            Some(5) => "Multiple running Blockbench processes use different userData profiles; close the extra Blockbench window before setup.".to_string(),
            _ => "Blockbench userData could not be resolved.".to_string(),
        });
    }

    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw.is_empty() {
        return Err("Blockbench userData path is empty.".to_string());
    }
    let path = PathBuf::from(raw);
    if !path.is_absolute() {
        return Err("Blockbench userData path is not absolute.".to_string());
    }
    Ok(path)
}

fn blockbench_managed_plugin_path() -> Result<PathBuf, String> {
    Ok(blockbench_user_data_dir()?.join("plugins").join("blockit_mcp.js"))
}

fn installed_plugin_path(root: &Path) -> Result<PathBuf, String> {
    let bytes = fs::read(root.join("installed.json"))
        .map_err(|_| "LazyDesigner managed installation state is unavailable.".to_string())?;
    let installed: InstalledState = serde_json::from_slice(&bytes)
        .map_err(|_| "LazyDesigner installed.json is invalid.".to_string())?;
    let plugin = installed.options.plugin;
    if plugin.file_name().and_then(|name| name.to_str()) != Some("blockit_mcp.js") {
        return Err("Managed plugin path has an unexpected filename.".to_string());
    }
    if !plugin.is_file() {
        return Err("Managed Blockbench plugin file is missing; use Repair installation.".to_string());
    }
    Ok(plugin)
}

fn managed_plugin_integrity(root: &Path) -> &'static str {
    let bytes = match fs::read(root.join("installed.json")) {
        Ok(bytes) => bytes,
        Err(_) => return "unknown",
    };
    let installed: InstalledState = match serde_json::from_slice(&bytes) {
        Ok(value) => value,
        Err(_) => return "unknown",
    };
    let plugin = installed.options.plugin;
    if plugin.file_name().and_then(|name| name.to_str()) != Some("blockit_mcp.js") {
        return "invalid";
    }
    if !plugin.is_file() {
        return "missing";
    }
    let expected = installed.owned.get(&plugin.to_string_lossy().to_string());
    let Some(expected) = expected else { return "unknown"; };
    let bytes = match fs::read(&plugin) {
        Ok(bytes) => bytes,
        Err(_) => return "unknown",
    };
    use sha2::{Digest, Sha256};
    let actual = format!("{:x}", Sha256::digest(bytes));
    if &actual == expected { "ready" } else { "modified" }
}

pub fn show_plugin_file() -> Result<PluginFileActionResult, String> {
    let root = managed_root()
        .ok_or_else(|| "LOCALAPPDATA/BLOCKIT_HOME is unavailable.".to_string())?;
    let plugin = installed_plugin_path(&root)?;
    Command::new("explorer.exe")
        .arg("/select,")
        .arg(&plugin)
        .spawn()
        .map_err(|error| format!("Unable to show the managed Blockbench plugin file: {error}"))?;
    Ok(PluginFileActionResult { status: "SHOWN" })
}

fn manager_executable(root: &Path) -> Result<PathBuf, String> {
    let installed_path = root.join("installed.json");
    let bytes = fs::read(&installed_path)
        .map_err(|_| "LazyDesigner managed installation is not present yet.".to_string())?;
    let installed: InstalledState = serde_json::from_slice(&bytes)
        .map_err(|_| "LazyDesigner installed.json is invalid.".to_string())?;
    if installed.source_sha.len() != 40
        || !installed.source_sha.chars().all(|ch| ch.is_ascii_hexdigit())
    {
        return Err("LazyDesigner installed source identity is invalid.".to_string());
    }

    let executable = root
        .join("versions")
        .join(installed.source_sha)
        .join("blockit.exe");
    if !executable.is_file() {
        return Err("LazyDesigner managed executable is missing.".to_string());
    }
    Ok(executable)
}

pub fn ensure_ready(app: &AppHandle) -> Result<EnsureReadyResult, String> {
    let initial = collect();
    if !initial.manager_available {
        return Err("LazyDesigner is not installed yet.".to_string());
    }

    let mut current = collect_connection_status();

    if current.plugin_integrity == "modified" || current.plugin_integrity == "invalid" {
        return Ok(EnsureReadyResult {
            status: "NEEDS_ATTENTION",
            reason: "PLUGIN_INTEGRITY",
            runtime_online: false,
            gateway_active: current.gateway_active.unwrap_or(false),
            blockbench_running: current.blockbench_running,
            plugin_integrity: current.plugin_integrity,
            manual_plugin_approval_recommended: false,
        });
    }

    if current.plugin_integrity == "missing" {
        if current.blockbench_running {
            return Ok(EnsureReadyResult {
                status: "NEEDS_ATTENTION",
                reason: "PLUGIN_MISSING_WHILE_BLOCKBENCH_RUNNING",
                runtime_online: false,
                gateway_active: current.gateway_active.unwrap_or(false),
                blockbench_running: current.blockbench_running,
                plugin_integrity: current.plugin_integrity,
                manual_plugin_approval_recommended: false,
            });
        }

        let maintenance = project_maintenance(true, initial.managed.as_ref(), current.runtime_listener_live);
        if !maintenance.repair {
            return Ok(EnsureReadyResult {
                status: "NEEDS_ATTENTION",
                reason: "REPAIR_BLOCKED",
                runtime_online: false,
                gateway_active: current.gateway_active.unwrap_or(false),
                blockbench_running: current.blockbench_running,
                plugin_integrity: current.plugin_integrity,
                manual_plugin_approval_recommended: false,
            });
        }

        run_managed_action(app, "repair")?;
        current = collect_connection_status();
        if current.plugin_integrity != "ready" {
            return Ok(EnsureReadyResult {
                status: "NEEDS_ATTENTION",
                reason: "REPAIR_DID_NOT_RESTORE_PLUGIN",
                runtime_online: false,
                gateway_active: current.gateway_active.unwrap_or(false),
                blockbench_running: current.blockbench_running,
                plugin_integrity: current.plugin_integrity,
                manual_plugin_approval_recommended: false,
            });
        }
    }

    if !current.blockbench_running {
        blockbench::open()?;
    }

    let started = std::time::Instant::now();
    while started.elapsed() < Duration::from_secs(15) {
        current = collect_connection_status();

        if current.runtime_listener_live {
            let verified = collect();
            if verified.runtime_ready {
                let gateway_active = verified.managed.as_ref().map(|value| value.gateway_active).unwrap_or(false);
                return Ok(EnsureReadyResult {
                    status: if gateway_active { "READY" } else { "RUNTIME_READY" },
                    reason: if gateway_active { "CONNECTED" } else { "WAITING_FOR_MCP_CLIENT" },
                    runtime_online: true,
                    gateway_active,
                    blockbench_running: current.blockbench_running,
                    plugin_integrity: current.plugin_integrity,
                    manual_plugin_approval_recommended: false,
                });
            }
            if verified.runtime_endpoint_match == Some(false) {
                return Ok(EnsureReadyResult {
                    status: "NEEDS_ATTENTION",
                    reason: "RUNTIME_ENDPOINT_MISMATCH",
                    runtime_online: false,
                    gateway_active: current.gateway_active.unwrap_or(false),
                    blockbench_running: current.blockbench_running,
                    plugin_integrity: current.plugin_integrity,
                    manual_plugin_approval_recommended: false,
                });
            }
        }

        if !current.blockbench_running && started.elapsed() > Duration::from_secs(3) {
            return Ok(EnsureReadyResult {
                status: "NEEDS_ATTENTION",
                reason: "BLOCKBENCH_EXITED",
                runtime_online: false,
                gateway_active: current.gateway_active.unwrap_or(false),
                blockbench_running: false,
                plugin_integrity: current.plugin_integrity,
                manual_plugin_approval_recommended: false,
            });
        }

        std::thread::sleep(Duration::from_millis(750));
    }

    current = collect_connection_status();
    let probe_known = current.gateway_active.is_some();
    let likely_first_approval = probe_known
        && current.blockbench_running
        && current.plugin_integrity == "ready"
        && !current.runtime_listener_live
        && !current.project_session_live;

    Ok(EnsureReadyResult {
        status: if likely_first_approval { "APPROVAL_REQUIRED" } else { "NEEDS_ATTENTION" },
        reason: if !probe_known { "CONNECTION_PROBE_UNKNOWN" } else if likely_first_approval { "RUNTIME_TIMEOUT_WITH_HEALTHY_PLUGIN" } else if current.project_session_live { "RUNTIME_START_FAILED" } else { "RUNTIME_TIMEOUT" },
        runtime_online: false,
        gateway_active: current.gateway_active.unwrap_or(false),
        blockbench_running: current.blockbench_running,
        plugin_integrity: current.plugin_integrity,
        manual_plugin_approval_recommended: likely_first_approval,
    })
}

fn unknown_gateway() -> GatewaySupervision {
    GatewaySupervision {
        ownership: "client-owned",
        state: "unknown",
        action: Some("Managed status is unavailable; refresh or diagnose the managed installation before lifecycle decisions."),
    }
}

fn project_gateway(managed: Option<&ManagedStatus>, blockbench_running: bool, runtime_ready: bool) -> GatewaySupervision {
    let active = managed.map(|value| value.gateway_active).unwrap_or(false);

    match (active, runtime_ready, blockbench_running) {
        (true, true, _) => GatewaySupervision {
            ownership: "client-owned",
            state: "healthy",
            action: None,
        },
        (true, false, _) => GatewaySupervision {
            ownership: "client-owned",
            state: "waiting-runtime",
            action: Some("Keep the current client Gateway session and restore/reload the Blockbench Runtime. Do not start a second Gateway."),
        },
        (false, true, _) => GatewaySupervision {
            ownership: "client-owned",
            state: "client-disconnected",
            action: Some("Reconnect LazyDesigner MCP in Codex or the active MCP client; that client owns Gateway startup."),
        },
        (false, false, true) => GatewaySupervision {
            ownership: "client-owned",
            state: "runtime-offline",
            action: Some("Restore or reload the LazyDesigner Runtime in Blockbench, then reconnect LazyDesigner MCP in the client if needed."),
        },
        (false, false, false) => GatewaySupervision {
            ownership: "client-owned",
            state: "idle",
            action: Some("Start Blockbench, then reconnect LazyDesigner MCP in Codex or the active MCP client."),
        },
    }
}


fn project_product_state(
    manager_available: bool,
    managed: Option<&ManagedStatus>,
    blockbench: &BlockbenchState,
    runtime_ready: bool,
    gateway: &GatewaySupervision,
    plugin_integrity: &str,
) -> &'static str {
    if !manager_available {
        return "welcome";
    }
    let Some(managed) = managed else {
        return "attention";
    };
    if !managed.tls_ready {
        return "security-setup";
    }
    if matches!(
        blockbench.compatibility.as_ref().map(|value| value.status.as_str()),
        Some("unsupported" | "invalid")
    ) {
        return "unsupported";
    }
    if matches!(plugin_integrity, "modified" | "invalid") {
        return "attention";
    }
    if plugin_integrity == "missing" && blockbench.running {
        return "plugin-setup";
    }
    if !blockbench.running {
        return "ready-start";
    }
    if !runtime_ready {
        return "plugin-setup";
    }
    if gateway.state == "healthy" {
        return "ready";
    }
    if gateway.state == "client-disconnected" {
        return "client-wait";
    }
    "attention"
}

fn project_readiness(
    manager_available: bool,
    managed: Option<&ManagedStatus>,
    blockbench_running: bool,
    runtime_ready: bool,
    gateway: &GatewaySupervision,
    plugin_integrity: &str,
) -> ReadinessProjection {
    if !manager_available {
        return ReadinessProjection {
            state: "setup-required",
            summary: "Install managed LazyDesigner components first.",
            ready: false,
        };
    }
    let Some(managed) = managed else {
        return ReadinessProjection {
            state: "needs-attention",
            summary: "Managed status is unavailable. Export diagnostics if refresh does not recover.",
            ready: false,
        };
    };
    if !managed.tls_ready {
        return ReadinessProjection {
            state: "needs-attention",
            summary: "Runtime security setup is incomplete.",
            ready: false,
        };
    }
    if matches!(plugin_integrity, "modified" | "invalid") {
        return ReadinessProjection {
            state: "needs-attention",
            summary: "Managed Blockbench plugin integrity requires attention.",
            ready: false,
        };
    }
    if !blockbench_running {
        return ReadinessProjection {
            state: "ready-to-start",
            summary: "Managed components are healthy; open Blockbench to begin.",
            ready: false,
        };
    }
    if gateway.state == "healthy" && runtime_ready {
        return ReadinessProjection {
            state: "ready",
            summary: "Blockbench Runtime and client-owned Gateway are connected.",
            ready: true,
        };
    }
    ReadinessProjection {
        state: "needs-connection",
        summary: gateway.action.unwrap_or("Restore Runtime/Gateway connectivity."),
        ready: false,
    }
}

fn observed_at_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(u64::MAX as u128) as u64
}

fn compose_status(
    blockbench: BlockbenchState,
    manager_available: bool,
    managed: Option<ManagedStatus>,
    diagnostic: Option<String>,
) -> SystemStatus {
    let plugin_integrity = managed_root()
        .as_deref()
        .map(managed_plugin_integrity)
        .unwrap_or("unknown");
    let mut process_system = System::new_all();
    process_system.refresh_processes();
    let runtime_session = runtime_session_probe(blockbench.running, &process_system);
    let runtime_endpoint_match = runtime_endpoint_match(managed.as_ref(), &runtime_session);
    let runtime_ready = runtime_ready(managed.as_ref(), &runtime_session);
    let gateway = if manager_available && managed.is_none() {
        unknown_gateway()
    } else {
        project_gateway(managed.as_ref(), blockbench.running, runtime_ready)
    };
    let readiness = project_readiness(
        manager_available,
        managed.as_ref(),
        blockbench.running,
        runtime_ready,
        &gateway,
        plugin_integrity,
    );
    let maintenance = project_maintenance(manager_available, managed.as_ref(), runtime_session.live);
    let (_, project_session_live) = project_navigation_probe(blockbench.running);
    let project_navigation = project_navigation_projection(project_session_live);
    let product_state = project_product_state(
        manager_available,
        managed.as_ref(),
        &blockbench,
        runtime_ready,
        &gateway,
        plugin_integrity,
    );

    SystemStatus {
        schema: 1,
        product_state,
        plugin_integrity,
        observed_at_unix_ms: observed_at_unix_ms(),
        readiness,
        blockbench,
        gateway,
        maintenance,
        manager_available,
        bootstrap_available: false,
        runtime_listener_live: runtime_session.live,
        runtime_endpoint_match,
        runtime_ready,
        managed,
        project_navigation,
        diagnostic,
    }
}

fn project_maintenance(manager_available: bool, managed: Option<&ManagedStatus>, runtime_listener_live: bool) -> MaintenanceAvailability {
    if !manager_available {
        return MaintenanceAvailability {
            update: false,
            rollback: false,
            repair: false,
            recover: false,
            setup_tls: false,
            blocked_reason: Some("Managed LazyDesigner installation is unavailable."),
        };
    }

    let Some(managed) = managed else {
        return MaintenanceAvailability {
            update: false,
            rollback: false,
            repair: false,
            recover: false,
            setup_tls: false,
            blocked_reason: Some("Managed status is unavailable; refresh before maintenance."),
        };
    };

    let busy = managed.gateway_active || managed.runtime_online || runtime_listener_live;
    let tls_ready = managed.tls_ready;
    MaintenanceAvailability {
        update: true,
        rollback: !busy && managed.rollback.as_ref().map(|value| value.available).unwrap_or(false),
        repair: !busy,
        recover: !busy,
        setup_tls: !busy && !tls_ready,
        blocked_reason: if busy {
            Some("Close active Codex MCP sessions and Blockbench Runtime before repair, recovery, or Runtime security setup.")
        } else {
            None
        },
    }
}

fn gateway_active_fast(root: &Path, system: &System) -> Option<bool> {
    let leases = root.join("leases");
    let entries = match fs::read_dir(&leases) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Some(false),
        Err(_) => return None,
    };

    for entry in entries {
        let entry = entry.ok()?;
        if !entry.file_type().ok()?.is_file() {
            return None;
        }
        let name = entry.file_name();
        let name = name.to_str()?;
        let pid = name.strip_suffix(".json")?.parse::<u32>().ok()?;
        if system.process(Pid::from_u32(pid)).is_some() {
            return Some(true);
        }
    }
    Some(false)
}

pub fn collect_connection_status() -> ConnectionStatus {
    let mut system = System::new_all();
    system.refresh_processes();
    let blockbench_running = system.processes().values().any(|process| {
        let name = process.name().to_ascii_lowercase();
        name == "blockbench.exe" || name == "blockbench"
    });

    let (project_revision, project_session_live) = project_navigation_probe(blockbench_running);
    let runtime_session = runtime_session_probe(blockbench_running, &system);

    let Some(root) = managed_root() else {
        return ConnectionStatus {
            schema: 1,
            observed_at_unix_ms: observed_at_unix_ms(),
            blockbench_running,
            runtime_listener_live: runtime_session.live,
            gateway_active: None,
            plugin_integrity: "unknown",
            project_revision: project_revision.clone(),
            project_session_live,
        };
    };

    let plugin_integrity = managed_plugin_integrity(&root);
    if manager_executable(&root).is_err() {
        return ConnectionStatus {
            schema: 1,
            observed_at_unix_ms: observed_at_unix_ms(),
            blockbench_running,
            runtime_listener_live: runtime_session.live,
            gateway_active: None,
            plugin_integrity,
            project_revision: project_revision.clone(),
            project_session_live,
        };
    }

    ConnectionStatus {
        schema: 1,
        observed_at_unix_ms: observed_at_unix_ms(),
        blockbench_running,
        runtime_listener_live: runtime_session.live,
        gateway_active: gateway_active_fast(&root, &system),
        plugin_integrity,
        project_revision: project_revision.clone(),
        project_session_live,
    }
}

pub fn collect() -> SystemStatus {
    let blockbench = blockbench::detect();
    let Some(root) = managed_root() else {
        return compose_status(
            blockbench,
            false,
            None,
            Some("LOCALAPPDATA/BLOCKIT_HOME is unavailable.".to_string()),
        );
    };

    let executable = match manager_executable(&root) {
        Ok(path) => path,
        Err(message) => return compose_status(blockbench, false, None, Some(message)),
    };

    let output = match run_output(
        Command::new(&executable)
            .arg("status")
            .arg("--root")
            .arg(&root),
        Duration::from_secs(5),
        "Managed status",
    ) {
        Ok(output) => output,
        Err(error) => {
            return compose_status(
                blockbench,
                true,
                None,
                Some(format!("Unable to read managed status: {error}")),
            )
        }
    };

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).lines().filter(|line| serde_json::from_str::<ManagedProgressEvent>(line).is_err()).collect::<Vec<_>>().join("\n").trim().to_string();
        return compose_status(
            blockbench,
            true,
            None,
            Some(if error.is_empty() {
                "Managed status command failed.".to_string()
            } else {
                error
            }),
        );
    }

    match serde_json::from_slice::<ManagedStatus>(&output.stdout) {
        Ok(managed) if managed.schema == 1 => compose_status(blockbench, true, Some(managed), None),
        Ok(_) | Err(_) => compose_status(
            blockbench,
            true,
            None,
            Some("Managed status returned invalid JSON or an unsupported schema.".to_string()),
        ),
    }
}


pub fn bootstrap_resource(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let manager = app
        .path()
        .resolve("resources/managed/blockit.exe", BaseDirectory::Resource)
        .map_err(|error| format!("Unable to resolve LazyDesigner bootstrap resource: {error}"))?;
    if !manager.is_file() {
        return Err("LazyDesigner installer does not contain a managed bootstrap package.".to_string());
    }
    let package = manager
        .parent()
        .ok_or_else(|| "LazyDesigner bootstrap package path is invalid.".to_string())?;
    if !package.join("blockit-package.json").is_file() {
        return Err("LazyDesigner bootstrap package manifest is missing.".to_string());
    }
    Ok(manager)
}

pub fn bootstrap_available(app: &tauri::AppHandle) -> bool {
    bootstrap_resource(app).is_ok()
}

pub fn bootstrap_install(app: &tauri::AppHandle) -> Result<BootstrapActionResult, String> {
    if managed_root()
        .and_then(|root| manager_executable(&root).ok())
        .is_some()
    {
        return Err("LazyDesigner is already installed; use Update or Repair instead.".to_string());
    }

    let manager = bootstrap_resource(app)?;
    let package = manager
        .parent()
        .ok_or_else(|| "LazyDesigner bootstrap package path is invalid.".to_string())?;
    let root = managed_root()
        .ok_or_else(|| "LOCALAPPDATA/BLOCKIT_HOME is unavailable.".to_string())?;
    let plugin = blockbench_managed_plugin_path()?;

    let output = run_output(
        Command::new(&manager)
            .arg("install")
            .arg("--root")
            .arg(&root)
            .arg("--package")
            .arg(package)
            .arg("--plugin-path")
            .arg(&plugin),
        Duration::from_secs(300),
        "LazyDesigner bootstrap installation",
    )?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).lines().filter(|line| serde_json::from_str::<ManagedProgressEvent>(line).is_err()).collect::<Vec<_>>().join("\n").trim().to_string();
        return Err(if error.is_empty() {
            "LazyDesigner bootstrap installation failed.".to_string()
        } else {
            error
        });
    }

    let receipt = serde_json::from_slice::<Value>(&output.stdout)
        .map_err(|_| "LazyDesigner bootstrap returned invalid JSON.".to_string())?;
    Ok(BootstrapActionResult {
        action: "install",
        receipt,
    })
}

pub fn run_managed_action(app: &AppHandle, action: &str) -> Result<ManagedActionResult, String> {
    if !matches!(action, "update" | "rollback" | "recover" | "repair" | "setup-tls") {
        return Err("Unsupported LazyDesigner desktop action.".to_string());
    }

    let root = managed_root()
        .ok_or_else(|| "LOCALAPPDATA/BLOCKIT_HOME is unavailable.".to_string())?;
    let executable = manager_executable(&root)?;

    let timeout = match action {
        "setup-tls" => Duration::from_secs(60),
        "update" | "rollback" | "recover" | "repair" => Duration::from_secs(300),
        _ => Duration::from_secs(60),
    };
    let output = run_output_with_stderr_lines(
        Command::new(&executable).arg(action).arg("--root").arg(&root).arg("--progress-json"),
        timeout,
        &format!("Managed {action}"),
        |line| {
            if let Ok(event) = serde_json::from_str::<ManagedProgressEvent>(line) {
                if event.schema == 1 && event.kind == "progress" && event.action == action { let _ = app.emit("managed-progress", event); }
            }
        },
    )?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).lines().filter(|line| serde_json::from_str::<ManagedProgressEvent>(line).is_err()).collect::<Vec<_>>().join("\n").trim().to_string();
        return Err(if error.is_empty() {
            format!("Managed {action} failed.")
        } else {
            error
        });
    }

    let receipt = serde_json::from_slice::<Value>(&output.stdout)
        .map_err(|_| format!("Managed {action} returned invalid JSON."))?;

    Ok(ManagedActionResult {
        action: action.to_string(),
        receipt,
    })
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
    fn missing_installation_is_diagnostic_not_panic() {
        let result = manager_executable(Path::new("Z:/definitely-missing-lazydesigner-root"));
        assert!(result.is_err());
    }

    #[test]
    fn navigation_profile_identity_normalizes_windows_path_shape() {
        let first = navigation_profile_id(Path::new("C:/Users/Test/AppData/Roaming/Blockbench/"));
        let second = navigation_profile_id(Path::new("c:\\users\\test\\appdata\\roaming\\blockbench"));
        assert_eq!(first, second);
        assert!(valid_navigation_profile_id(&first));
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

    #[test]
    fn runtime_endpoint_match_requires_same_listener_and_gateway_url() {
        let managed = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: false,
            runtime_online: true,
            runtime_url: "https://127.0.0.1:3000/bb-mcp".to_string(),
            tls_ready: true,
            tls_error: None,
            rollback: None,
        };
        let matching = RuntimeSessionProbe {
            live: true,
            runtime_url: Some("https://127.0.0.1:3000/bb-mcp".to_string()),
        };
        let mismatched = RuntimeSessionProbe {
            live: true,
            runtime_url: Some("https://127.0.0.1:3100/bb-mcp".to_string()),
        };

        assert_eq!(runtime_endpoint_match(Some(&managed), &matching), Some(true));
        assert!(runtime_ready(Some(&managed), &matching));
        let localhost = RuntimeSessionProbe {
            live: true,
            runtime_url: Some("https://localhost:3000/bb-mcp".to_string()),
        };
        assert_eq!(runtime_endpoint_match(Some(&managed), &localhost), Some(true));
        assert_eq!(runtime_endpoint_identity("https://localhost:443/"), Some((443, "/".to_string())));
        assert_eq!(runtime_endpoint_identity("https://localhost"), Some((443, "/".to_string())));
        assert_eq!(runtime_endpoint_match(Some(&managed), &mismatched), Some(false));
        assert!(!runtime_ready(Some(&managed), &mismatched));
        let legacy_http = ManagedStatus {
            runtime_url: "http://127.0.0.1:3000/bb-mcp".to_string(),
            ..managed
        };
        assert_eq!(runtime_endpoint_match(Some(&legacy_http), &matching), Some(false));
    }

    #[test]
    fn managed_plugin_filename_is_stable() {
        let path = Path::new("C:/Users/test/AppData/Roaming/Blockbench/plugins/blockit_mcp.js");
        assert_eq!(path.file_name().and_then(|name| name.to_str()), Some("blockit_mcp.js"));
    }

    #[test]
    fn managed_plugin_integrity_is_fail_closed_for_missing_installation() {
        assert_eq!(managed_plugin_integrity(Path::new("Z:/definitely-missing-lazydesigner-root")), "unknown");
    }

    #[test]
    fn product_state_rejects_modified_plugin_before_launch() {
        let managed = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: false,
            runtime_online: false,
            runtime_url: "https://127.0.0.1:3000/bb-mcp".to_string(),
            tls_ready: true,
            tls_error: None,
            rollback: None,
        };
        let blockbench = BlockbenchState {
            running: false,
            version: Some("5.2.0".to_string()),
            compatibility: Some(blockbench::evaluate_compatibility("5.2.0").unwrap()),
            diagnostic: None,
        };
        let gateway = project_gateway(Some(&managed), false, false);
        assert_eq!(project_product_state(true, Some(&managed), &blockbench, false, &gateway, "modified"), "attention");
    }

    #[test]
    fn gateway_supervision_preserves_client_ownership() {
        let managed = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: false,
            runtime_online: true,
            runtime_url: "https://127.0.0.1:3000/bb-mcp".to_string(),
            tls_ready: true,
            tls_error: None,
            rollback: None,
        };
        let result = project_gateway(Some(&managed), true, true);
        assert_eq!(result.ownership, "client-owned");
        assert_eq!(result.state, "client-disconnected");
        assert!(result.action.unwrap().contains("Reconnect LazyDesigner MCP"));
    }

    #[test]
    fn readiness_projection_covers_workstation_states() {
        let healthy = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: true,
            runtime_online: true,
            runtime_url: "https://127.0.0.1:3000/bb-mcp".to_string(),
            tls_ready: true,
            tls_error: None,
            rollback: None,
        };
        let gateway = project_gateway(Some(&healthy), true, true);
        let ready = project_readiness(true, Some(&healthy), true, true, &gateway, "ready");
        assert_eq!(ready.state, "ready");
        assert!(ready.ready);

        let closed_gateway = project_gateway(Some(&healthy), false, false);
        let start = project_readiness(true, Some(&healthy), false, false, &closed_gateway, "ready");
        assert_eq!(start.state, "ready-to-start");
        assert!(!start.ready);

        let disconnected = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: false,
            runtime_online: true,
            runtime_url: "https://127.0.0.1:3000/bb-mcp".to_string(),
            tls_ready: true,
            tls_error: None,
            rollback: None,
        };
        let disconnected_gateway = project_gateway(Some(&disconnected), true, true);
        let connection = project_readiness(true, Some(&disconnected), true, true, &disconnected_gateway, "ready");
        assert_eq!(connection.state, "needs-connection");

        let setup = project_readiness(false, None, false, false, &unknown_gateway(), "unknown");
        assert_eq!(setup.state, "setup-required");

        let attention = project_readiness(true, None, false, false, &unknown_gateway(), "unknown");
        assert_eq!(attention.state, "needs-attention");
    }

    #[test]
    fn maintenance_projection_matches_managed_runtime_safety_gate() {
        let idle = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: false,
            runtime_online: false,
            runtime_url: "https://127.0.0.1:3000/bb-mcp".to_string(),
            tls_ready: true,
            tls_error: None,
            rollback: None,
        };
        let ready = project_maintenance(true, Some(&idle), false);
        assert!(ready.update && ready.repair && ready.recover);
        assert!(!ready.rollback);
        assert!(!ready.setup_tls);

        let busy = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: true,
            runtime_online: false,
            runtime_url: "https://127.0.0.1:3000/bb-mcp".to_string(),
            tls_ready: false,
            tls_error: Some("missing identity".to_string()),
            rollback: None,
        };
        let blocked = project_maintenance(true, Some(&busy), true);
        assert!(blocked.update);
        assert!(!blocked.repair && !blocked.recover && !blocked.setup_tls);
        assert!(blocked.blocked_reason.is_some());
    }
}


#[cfg(test)]
mod tls_projection_tests {
    use super::*;

    #[test]
    fn maintenance_offers_tls_setup_only_when_idle_and_not_ready() {
        let missing = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: false,
            runtime_online: false,
            runtime_url: "https://127.0.0.1:3000/bb-mcp".to_string(),
            tls_ready: false,
            tls_error: Some("missing".to_string()),
            rollback: None,
        };
        let availability = project_maintenance(true, Some(&missing), false);
        assert!(availability.setup_tls);
    }
}
