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

#[derive(Debug, Serialize)]
pub struct GatewaySupervision {
    pub ownership: &'static str,
    pub state: &'static str,
    pub action: Option<&'static str>,
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
    pub manager_available: bool,
    pub managed: Option<Value>,
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

fn detect_blockbench() -> BlockbenchState {
    let mut system = System::new_all();
    system.refresh_processes();

    let process = system.processes().values().find(|process| {
        let name = process.name().to_ascii_lowercase();
        name == "blockbench.exe" || name == "blockbench"
    });

    let Some(process) = process else {
        return BlockbenchState {
            running: false,
            version: None,
            compatibility: None,
            diagnostic: None,
        };
    };

    let Some(executable) = process.exe() else {
        return BlockbenchState {
            running: true,
            version: None,
            compatibility: None,
            diagnostic: Some("Blockbench is running, but its executable path is unavailable.".to_string()),
        };
    };

    let script = "(Get-Item -LiteralPath $env:LAZYDESIGNER_BLOCKBENCH_EXE).VersionInfo.ProductVersion";
    let output = match Command::new("powershell.exe")
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script])
        .env("LAZYDESIGNER_BLOCKBENCH_EXE", executable)
        .output()
    {
        Ok(output) => output,
        Err(error) => {
            return BlockbenchState {
                running: true,
                version: None,
                compatibility: None,
                diagnostic: Some(format!("Unable to inspect Blockbench version: {error}")),
            }
        }
    };

    if !output.status.success() {
        return BlockbenchState {
            running: true,
            version: None,
            compatibility: None,
            diagnostic: Some("Blockbench version inspection failed.".to_string()),
        };
    }

    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let version = raw.split_whitespace().next().unwrap_or("").to_string();
    if version.is_empty() {
        return BlockbenchState {
            running: true,
            version: None,
            compatibility: None,
            diagnostic: Some("Blockbench version information is empty.".to_string()),
        };
    }

    match evaluate_blockbench_compatibility(&version) {
        Ok(compatibility) => BlockbenchState {
            running: true,
            version: Some(version),
            compatibility: Some(compatibility),
            diagnostic: None,
        },
        Err(message) => BlockbenchState {
            running: true,
            version: Some(version),
            compatibility: None,
            diagnostic: Some(message),
        },
    }
}


fn project_gateway(managed: Option<&Value>, blockbench_running: bool) -> GatewaySupervision {
    let active = managed
        .and_then(|value| value.get("gateway_active"))
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let runtime_online = managed
        .and_then(|value| value.get("runtime_online"))
        .and_then(Value::as_bool)
        .unwrap_or(false);

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

pub fn collect() -> SystemStatus {
    let blockbench = detect_blockbench();
    let Some(root) = managed_root() else {
        return SystemStatus {
            schema: 1,
            gateway: project_gateway(None, blockbench.running),
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

    match serde_json::from_slice::<Value>(&output.stdout) {
        Ok(managed) => {
            let gateway = project_gateway(Some(&managed), blockbench.running);
            SystemStatus {
                schema: 1,
                gateway,
                blockbench,
                manager_available: true,
                managed: Some(managed),
                diagnostic: None,
            }
        },
        Err(_) => SystemStatus {
            schema: 1,
            gateway: project_gateway(None, blockbench.running),
            blockbench,
            manager_available: true,
            managed: None,
            diagnostic: Some("Managed status returned invalid JSON.".to_string()),
        },
    }
}

pub fn run_managed_action(action: &str) -> Result<ManagedActionResult, String> {
    if !matches!(action, "update" | "recover") {
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
    fn gateway_supervision_preserves_client_ownership() {
        let managed = serde_json::json!({
            "gateway_active": false,
            "runtime_online": true
        });
        let result = project_gateway(Some(&managed), true);
        assert_eq!(result.ownership, "client-owned");
        assert_eq!(result.state, "client-disconnected");
        assert!(result.action.unwrap().contains("Reconnect LazyDesigner MCP"));
    }
}
