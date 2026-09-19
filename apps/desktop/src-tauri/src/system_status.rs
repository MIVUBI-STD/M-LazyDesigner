use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    env,
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use sysinfo::System;

#[derive(Debug, Deserialize)]
struct BlockbenchCompatibilityManifest {
    minimumVersion: String,
    reviewBoundaryVersion: String,
    sourceTypeBaseline: String,
    liveValidatedVersions: Vec<String>,
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
pub struct ManagedStatus {
    pub schema: u8,
    pub installed: Option<ManagedInstalled>,
    pub pending: bool,
    pub gateway_active: bool,
    pub runtime_online: bool,
}

#[derive(Debug, Serialize)]
pub struct MaintenanceAvailability {
    pub update: bool,
    pub repair: bool,
    pub recover: bool,
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
pub struct ManagedActionResult {
    pub action: String,
    pub receipt: Value,
}

#[derive(Debug, Serialize)]
pub struct SystemStatus {
    pub schema: u8,
    pub blockbench: BlockbenchState,
    pub gateway: GatewaySupervision,
    pub maintenance: MaintenanceAvailability,
    pub manager_available: bool,
    pub managed: Option<ManagedStatus>,
    pub diagnostic: Option<String>,
}

#[derive(Debug, Deserialize)]
struct InstalledState {
    source_sha: String,
}

fn managed_root() -> Option<PathBuf> {
    env::var_os("BLOCKIT_HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("LOCALAPPDATA").map(|base| PathBuf::from(base).join("BlockIT")))
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
    let minimum = parse_version(&manifest.minimumVersion)
        .ok_or_else(|| "Invalid minimum Blockbench compatibility version.".to_string())?;
    let review = parse_version(&manifest.reviewBoundaryVersion)
        .ok_or_else(|| "Invalid Blockbench review boundary version.".to_string())?;
    let live_validated = manifest.liveValidatedVersions.iter().any(|candidate| candidate == version);

    let status = match parsed {
        None => "invalid",
        Some(current) if current < minimum => "unsupported",
        Some(_) if live_validated => "validated",
        Some(current) if current >= review => "review-required",
        Some(_) => "compatible-unverified",
    };

    Ok(BlockbenchCompatibility {
        status: status.to_string(),
        minimum_version: manifest.minimumVersion,
        review_boundary_version: manifest.reviewBoundaryVersion,
        source_type_baseline: manifest.sourceTypeBaseline,
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
    let output = Command::new("powershell.exe")
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script])
        .output()
        .map_err(|error| format!("Unable to discover Blockbench installation: {error}"))?;

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
    let output = Command::new("powershell.exe")
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script])
        .env("LAZYDESIGNER_BLOCKBENCH_EXE", executable)
        .output()
        .map_err(|error| format!("Unable to inspect Blockbench version: {error}"))?;

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


fn project_maintenance(manager_available: bool, managed: Option<&ManagedStatus>) -> MaintenanceAvailability {
    if !manager_available {
        return MaintenanceAvailability {
            update: false,
            repair: false,
            recover: false,
            blocked_reason: Some("Managed LazyDesigner installation is unavailable."),
        };
    }

    let busy = managed
        .map(|value| value.gateway_active || value.runtime_online)
        .unwrap_or(false);

    MaintenanceAvailability {
        update: true,
        repair: !busy,
        recover: !busy,
        blocked_reason: if busy {
            Some("Close active Codex MCP sessions and Blockbench Runtime before repair or recovery.")
        } else {
            None
        },
    }
}

pub fn collect() -> SystemStatus {
    let blockbench = detect_blockbench();
    let Some(root) = managed_root() else {
        return SystemStatus {
            schema: 1,
            gateway: project_gateway(None, blockbench.running),
            maintenance: project_maintenance(false, None),
            blockbench,
            manager_available: false,
            managed: None,
            diagnostic: Some("LOCALAPPDATA/BLOCKIT_HOME is unavailable.".to_string()),
        };
    };

    let executable = match manager_executable(&root) {
        Ok(path) => path,
        Err(message) => {
            return SystemStatus {
                schema: 1,
                gateway: project_gateway(None, blockbench.running),
                maintenance: project_maintenance(false, None),
                blockbench,
                manager_available: false,
                managed: None,
                diagnostic: Some(message),
            }
        }
    };

    let output = match Command::new(&executable)
        .arg("status")
        .arg("--root")
        .arg(&root)
        .output()
    {
        Ok(output) => output,
        Err(error) => {
            return SystemStatus {
                schema: 1,
                gateway: project_gateway(None, blockbench.running),
                maintenance: project_maintenance(true, None),
                blockbench,
                manager_available: true,
                managed: None,
                diagnostic: Some(format!("Unable to read managed status: {error}")),
            }
        }
    };

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return SystemStatus {
            schema: 1,
            gateway: project_gateway(None, blockbench.running),
            maintenance: project_maintenance(true, None),
            blockbench,
            manager_available: true,
            managed: None,
            diagnostic: Some(if error.is_empty() {
                "Managed status command failed.".to_string()
            } else {
                error
            }),
        };
    }

    match serde_json::from_slice::<ManagedStatus>(&output.stdout) {
        Ok(managed) if managed.schema == 1 => {
            let gateway = project_gateway(Some(&managed), blockbench.running);
            let maintenance = project_maintenance(true, Some(&managed));
            SystemStatus {
                schema: 1,
                gateway,
                maintenance,
                blockbench,
                manager_available: true,
                managed: Some(managed),
                diagnostic: None,
            }
        },
        Ok(_) | Err(_) => SystemStatus {
            schema: 1,
            gateway: project_gateway(None, blockbench.running),
            maintenance: project_maintenance(true, None),
            blockbench,
            manager_available: true,
            managed: None,
            diagnostic: Some("Managed status returned invalid JSON.".to_string()),
        },
    }
}

pub fn run_managed_action(action: &str) -> Result<ManagedActionResult, String> {
    if !matches!(action, "update" | "recover" | "repair") {
        return Err("Unsupported LazyDesigner desktop action.".to_string());
    }

    let root = managed_root()
        .ok_or_else(|| "LOCALAPPDATA/BLOCKIT_HOME is unavailable.".to_string())?;
    let executable = manager_executable(&root)?;

    let output = Command::new(&executable)
        .arg(action)
        .arg("--root")
        .arg(&root)
        .output()
        .map_err(|error| format!("Unable to run managed {action}: {error}"))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_string();
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
        };
        let result = project_gateway(Some(&managed), true);
        assert_eq!(result.ownership, "client-owned");
        assert_eq!(result.state, "client-disconnected");
        assert!(result.action.unwrap().contains("Reconnect LazyDesigner MCP"));
    }

    #[test]
    fn maintenance_projection_matches_managed_runtime_safety_gate() {
        let idle = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: false,
            runtime_online: false,
        };
        let ready = project_maintenance(true, Some(&idle));
        assert!(ready.update && ready.repair && ready.recover);

        let busy = ManagedStatus {
            schema: 1,
            installed: None,
            pending: false,
            gateway_active: true,
            runtime_online: false,
        };
        let blocked = project_maintenance(true, Some(&busy));
        assert!(blocked.update);
        assert!(!blocked.repair && !blocked.recover);
        assert!(blocked.blocked_reason.is_some());
    }
}
