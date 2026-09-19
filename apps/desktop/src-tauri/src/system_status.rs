use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    env,
    fs,
    path::{Path, PathBuf},
    collections::HashMap,
    process::Command,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use crate::process::{run_output, run_output_with_stderr_lines};
use sysinfo::System;
use tauri::{path::BaseDirectory, AppHandle, Emitter, Manager};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BlockbenchCompatibilityManifest {
    minimum_version: String,
    review_boundary_version: String,
    source_type_baseline: String,
    live_validated_versions: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct BlockbenchCompatibility {
    pub status: String,
    pub minimum_version: String,
    pub review_boundary_version: String,
    pub source_type_baseline: String,
    pub live_validated: bool,
}

#[derive(Debug, Serialize)]
pub struct BlockbenchState {
    pub running: bool,
    pub version: Option<String>,
    pub compatibility: Option<BlockbenchCompatibility>,
    pub diagnostic: Option<String>,
}

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
    pub tls_ready: bool,
    pub tls_error: Option<String>,
    #[serde(default)]
    pub rollback: Option<ManagedRollback>,
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
pub struct BlockbenchActionResult {
    pub status: &'static str,
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
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ManagedProgressEvent { pub schema: u8, pub kind: String, pub action: String, pub stage: String }

#[derive(Debug, Serialize)]
pub struct ReadinessProjection {
    pub state: &'static str,
    pub summary: &'static str,
    pub ready: bool,
}

#[derive(Debug, Serialize)]
pub struct SystemStatus {
    pub schema: u8,
    pub plugin_integrity: &'static str,
    pub observed_at_unix_ms: u64,
    pub readiness: ReadinessProjection,
    pub blockbench: BlockbenchState,
    pub gateway: GatewaySupervision,
    pub maintenance: MaintenanceAvailability,
    pub manager_available: bool,
    pub bootstrap_available: bool,
    pub managed: Option<ManagedStatus>,
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

fn managed_root() -> Option<PathBuf> {
    env::var_os("BLOCKIT_HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("LOCALAPPDATA").map(|base| PathBuf::from(base).join("BlockIT")))
}


fn blockbench_user_data_dir() -> Result<PathBuf, String> {
    let script = r#"
$process = Get-CimInstance Win32_Process -Filter "Name='Blockbench.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.ExecutablePath -and
    (Test-Path -LiteralPath $_.ExecutablePath -PathType Leaf) -and
    ((Get-Item -LiteralPath $_.ExecutablePath).VersionInfo.ProductName -eq 'Blockbench')
  } |
  Select-Object -First 1
if ($process) {
  if (!$process.CommandLine) { exit 3 }
  $match = [regex]::Match([string]$process.CommandLine, '(?i)(?:^|\s)--userData\s+(?:"([^"]+)"|(\S+))')
  if ($match.Success) {
    $value = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
    if (![IO.Path]::IsPathRooted($value)) { exit 4 }
    [Console]::Out.WriteLine([IO.Path]::GetFullPath($value))
    exit 0
  }
}
if (!$env:APPDATA) { exit 2 }
[Console]::Out.WriteLine((Join-Path $env:APPDATA 'Blockbench'))
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

fn compatibility_manifest() -> Result<BlockbenchCompatibilityManifest, String> {
    serde_json::from_str(include_str!("../../../../mcp/compatibility/blockbench.json"))
        .map_err(|_| "LazyDesigner Blockbench compatibility manifest is invalid.".to_string())
}

fn parse_version(value: &str) -> Option<(u64, u64, u64)> {
    let core = value.trim().trim_start_matches('v').split(['-', '+']).next()?;
    let mut parts = core.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts.next()?.parse().ok()?;
    if parts.next().is_some() {
        return None;
    }
    Some((major, minor, patch))
}

fn evaluate_blockbench_compatibility(version: &str) -> Result<BlockbenchCompatibility, String> {
    let manifest = compatibility_manifest()?;
    let parsed = parse_version(version);
    let minimum = parse_version(&manifest.minimum_version)
        .ok_or_else(|| "Invalid minimum Blockbench compatibility version.".to_string())?;
    let review = parse_version(&manifest.review_boundary_version)
        .ok_or_else(|| "Invalid Blockbench review boundary version.".to_string())?;
    let live_validated = manifest.live_validated_versions.iter().any(|candidate| candidate == version);

    let status = match parsed {
        None => "invalid",
        Some(current) if current < minimum => "unsupported",
        Some(_) if live_validated => "validated",
        Some(current) if current >= review => "review-required",
        Some(_) => "compatible-unverified",
    };

    Ok(BlockbenchCompatibility {
        status: status.to_string(),
        minimum_version: manifest.minimum_version,
        review_boundary_version: manifest.review_boundary_version,
        source_type_baseline: manifest.source_type_baseline,
        live_validated,
    })
}

fn discover_blockbench_executable(system: &System) -> Result<Option<PathBuf>, String> {
    if let Some(process) = system.processes().values().find(|process| {
        let name = process.name().to_ascii_lowercase();
        name == "blockbench.exe" || name == "blockbench"
    }) {
        if let Some(path) = process.exe() {
            if path.is_file() {
                return Ok(Some(path.to_path_buf()));
            }
        }
    }

    let script = r#"
$roots = @(
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
foreach ($root in $roots) {
  foreach ($entry in @(Get-ItemProperty -Path $root -ErrorAction SilentlyContinue)) {
    if ($entry.DisplayName -ne 'Blockbench') { continue }
    $candidates = @()
    if ($entry.InstallLocation) { $candidates += (Join-Path $entry.InstallLocation 'Blockbench.exe') }
    if ($entry.DisplayIcon) {
      $icon = [string]$entry.DisplayIcon
      if ($icon.StartsWith('"')) {
        $closing = $icon.IndexOf('"', 1)
        if ($closing -gt 1) { $icon = $icon.Substring(1, $closing - 1) }
      } else {
        $icon = ($icon -split ',')[0].Trim()
      }
      if ($icon) { $candidates += $icon }
    }
    foreach ($candidate in $candidates) {
      if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        [Console]::Out.WriteLine((Resolve-Path -LiteralPath $candidate).Path)
        exit 0
      }
    }
  }
}
exit 0
"#;
    let output = run_output(
        Command::new("powershell.exe")
            .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script]),
        Duration::from_secs(8),
        "Blockbench installation discovery",
    )?;

    if !output.status.success() {
        return Err("Blockbench registry discovery failed.".to_string());
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        return Ok(None);
    }

    let executable = PathBuf::from(path);
    if !executable.is_file() || !is_blockbench_executable_name(&executable) {
        return Err("Blockbench registry entry does not point to an executable file.".to_string());
    }
    Ok(Some(executable))
}

fn is_blockbench_executable_name(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.eq_ignore_ascii_case("Blockbench.exe"))
        .unwrap_or(false)
}

fn blockbench_version(executable: &Path) -> Result<String, String> {
    if !is_blockbench_executable_name(executable) {
        return Err("Discovered Blockbench path does not end in Blockbench.exe.".to_string());
    }

    let script = r#"
$info = (Get-Item -LiteralPath $env:LAZYDESIGNER_BLOCKBENCH_EXE).VersionInfo
if ($info.ProductName -ne 'Blockbench') { exit 2 }
[Console]::Out.WriteLine($info.ProductVersion)
"#;
    let output = run_output(
        Command::new("powershell.exe")
            .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script])
            .env("LAZYDESIGNER_BLOCKBENCH_EXE", executable),
        Duration::from_secs(8),
        "Blockbench version inspection",
    )?;

    if !output.status.success() {
        return Err("Blockbench version inspection failed.".to_string());
    }

    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let version = raw.split_whitespace().next().unwrap_or("").to_string();
    if version.is_empty() {
        return Err("Blockbench version information is empty.".to_string());
    }
    Ok(version)
}

fn detect_blockbench() -> BlockbenchState {
    let mut system = System::new_all();
    system.refresh_processes();
    let running = system.processes().values().any(|process| {
        let name = process.name().to_ascii_lowercase();
        name == "blockbench.exe" || name == "blockbench"
    });

    let executable = match discover_blockbench_executable(&system) {
        Ok(Some(path)) => path,
        Ok(None) => {
            return BlockbenchState {
                running,
                version: None,
                compatibility: None,
                diagnostic: if running {
                    Some("Blockbench is running, but its executable path is unavailable.".to_string())
                } else {
                    Some("Blockbench desktop installation was not found.".to_string())
                },
            }
        }
        Err(message) => {
            return BlockbenchState {
                running,
                version: None,
                compatibility: None,
                diagnostic: Some(message),
            }
        }
    };

    let version = match blockbench_version(&executable) {
        Ok(version) => version,
        Err(message) => {
            return BlockbenchState {
                running,
                version: None,
                compatibility: None,
                diagnostic: Some(message),
            }
        }
    };

    match evaluate_blockbench_compatibility(&version) {
        Ok(compatibility) => BlockbenchState {
            running,
            version: Some(version),
            compatibility: Some(compatibility),
            diagnostic: None,
        },
        Err(message) => BlockbenchState {
            running,
            version: Some(version),
            compatibility: None,
            diagnostic: Some(message),
        },
    }
}

pub fn open_blockbench() -> Result<BlockbenchActionResult, String> {
    let mut system = System::new_all();
    system.refresh_processes();
    let already_running = system.processes().values().any(|process| {
        let name = process.name().to_ascii_lowercase();
        name == "blockbench.exe" || name == "blockbench"
    });
    if already_running {
        return Ok(BlockbenchActionResult { status: "ALREADY_RUNNING" });
    }

    let executable = discover_blockbench_executable(&system)?
        .ok_or_else(|| "Blockbench desktop installation was not found.".to_string())?;

    blockbench_version(&executable)?;

    Command::new(&executable)
        .spawn()
        .map_err(|error| format!("Unable to open Blockbench: {error}"))?;

    Ok(BlockbenchActionResult { status: "STARTED" })
}

fn unknown_gateway() -> GatewaySupervision {
    GatewaySupervision {
        ownership: "client-owned",
        state: "unknown",
        action: Some("Managed status is unavailable; refresh or diagnose the managed installation before lifecycle decisions."),
    }
}

fn project_gateway(managed: Option<&ManagedStatus>, blockbench_running: bool) -> GatewaySupervision {
    let active = managed.map(|value| value.gateway_active).unwrap_or(false);
    let runtime_online = managed.map(|value| value.runtime_online).unwrap_or(false);

    match (active, runtime_online, blockbench_running) {
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


fn project_readiness(
    manager_available: bool,
    managed: Option<&ManagedStatus>,
    blockbench_running: bool,
    gateway: &GatewaySupervision,
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
    if !blockbench_running {
        return ReadinessProjection {
            state: "ready-to-start",
            summary: "Managed components are healthy; open Blockbench to begin.",
            ready: false,
        };
    }
    if gateway.state == "healthy" && managed.runtime_online {
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
    let gateway = if manager_available && managed.is_none() {
        unknown_gateway()
    } else {
        project_gateway(managed.as_ref(), blockbench.running)
    };
    let readiness = project_readiness(
        manager_available,
        managed.as_ref(),
        blockbench.running,
        &gateway,
    );
    let maintenance = project_maintenance(manager_available, managed.as_ref());

    let plugin_integrity = managed_root()
        .as_deref()
        .map(managed_plugin_integrity)
        .unwrap_or("unknown");

    SystemStatus {
        schema: 1,
        plugin_integrity,
        observed_at_unix_ms: observed_at_unix_ms(),
        readiness,
        blockbench,
        gateway,
        maintenance,
        manager_available,
        bootstrap_available: false,
        managed,
        diagnostic,
    }
}

fn project_maintenance(manager_available: bool, managed: Option<&ManagedStatus>) -> MaintenanceAvailability {
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

    let busy = managed.gateway_active || managed.runtime_online;
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

pub fn collect() -> SystemStatus {
    let blockbench = detect_blockbench();
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

    #[test]
    fn missing_installation_is_diagnostic_not_panic() {
        let result = manager_executable(Path::new("Z:/definitely-missing-lazydesigner-root"));
        assert!(result.is_err());
    }

    #[test]
    fn canonical_manifest_marks_recorded_live_version_validated() {
        let result = evaluate_blockbench_compatibility("5.2.0").unwrap();
        assert_eq!(result.status, "validated");
        assert!(result.live_validated);
    }

    #[test]
    fn canonical_manifest_requires_review_at_next_family_boundary() {
        let result = evaluate_blockbench_compatibility("5.3.0").unwrap();
        assert_eq!(result.status, "review-required");
    }

    #[test]
    fn managed_plugin_filename_is_stable() {
        let path = Path::new("C:/Users/test/AppData/Roaming/Blockbench/plugins/blockit_mcp.js");
        assert_eq!(path.file_name().and_then(|name| name.to_str()), Some("blockit_mcp.js"));
    }

    #[test]
    fn executable_identity_requires_blockbench_filename() {
        assert!(is_blockbench_executable_name(Path::new("C:/Apps/Blockbench.exe")));
        assert!(!is_blockbench_executable_name(Path::new("C:/Apps/not-blockbench.exe")));
    }

    #[test]
    fn version_parser_accepts_blockbench_release_and_prerelease_core() {
        assert_eq!(parse_version("5.2.0"), Some((5, 2, 0)));
        assert_eq!(parse_version("5.2.0-beta.2"), Some((5, 2, 0)));
    }

    #[test]
    fn gateway_supervision_preserves_client_ownership() {
        let managed = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: false,
            runtime_online: true,
            tls_ready: true,
            tls_error: None,
            rollback: None,
        };
        let result = project_gateway(Some(&managed), true);
        assert_eq!(result.ownership, "client-owned");
        assert_eq!(result.state, "client-disconnected");
        assert!(result.action.unwrap().contains("Reconnect LazyDesigner MCP"));
    }

    #[test]
    #[test]
    fn readiness_projection_covers_workstation_states() {
        let healthy = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: true,
            runtime_online: true,
            tls_ready: true,
            tls_error: None,
            rollback: None,
        };
        let gateway = project_gateway(Some(&healthy), true);
        let ready = project_readiness(true, Some(&healthy), true, &gateway);
        assert_eq!(ready.state, "ready");
        assert!(ready.ready);

        let closed_gateway = project_gateway(Some(&healthy), false);
        let start = project_readiness(true, Some(&healthy), false, &closed_gateway);
        assert_eq!(start.state, "ready-to-start");
        assert!(!start.ready);

        let disconnected = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: false,
            runtime_online: true,
            tls_ready: true,
            tls_error: None,
            rollback: None,
        };
        let disconnected_gateway = project_gateway(Some(&disconnected), true);
        let connection = project_readiness(true, Some(&disconnected), true, &disconnected_gateway);
        assert_eq!(connection.state, "needs-connection");

        let setup = project_readiness(false, None, false, &unknown_gateway());
        assert_eq!(setup.state, "setup-required");

        let attention = project_readiness(true, None, false, &unknown_gateway());
        assert_eq!(attention.state, "needs-attention");
    }

    fn maintenance_projection_matches_managed_runtime_safety_gate() {
        let idle = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: false,
            runtime_online: false,
            tls_ready: true,
            tls_error: None,
            rollback: None,
        };
        let ready = project_maintenance(true, Some(&idle));
        assert!(ready.update && ready.repair && ready.recover);
        assert!(!ready.rollback);
        assert!(!ready.setup_tls);

        let busy = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: true,
            runtime_online: false,
            tls_ready: false,
            tls_error: Some("missing identity".to_string()),
            rollback: None,
        };
        let blocked = project_maintenance(true, Some(&busy));
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
            tls_ready: false,
            tls_error: Some("missing".to_string()),
            rollback: None,
        };
        let availability = project_maintenance(true, Some(&missing));
        assert!(availability.setup_tls);
    }
}
