use crate::process::run_output;
use serde::{Deserialize, Serialize};
use std::{
    path::{Path, PathBuf},
    process::Command,
    time::Duration,
};
use sysinfo::System;

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

#[derive(Debug, Serialize)]
pub struct BlockbenchActionResult {
    pub status: &'static str,
}

fn compatibility_manifest() -> Result<BlockbenchCompatibilityManifest, String> {
    serde_json::from_str(include_str!("../../../../mcp/compatibility/blockbench.json"))
        .map_err(|_| "LazyDesigner Blockbench compatibility manifest is invalid.".to_string())
}

pub(crate) fn parse_version(value: &str) -> Option<(u64, u64, u64)> {
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

pub(crate) fn evaluate_compatibility(version: &str) -> Result<BlockbenchCompatibility, String> {
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

fn discover_executable(system: &System) -> Result<Option<PathBuf>, String> {
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
    if !executable.is_file() || !is_executable_name(&executable) {
        return Err("Blockbench registry entry does not point to an executable file.".to_string());
    }
    Ok(Some(executable))
}

pub(crate) fn is_executable_name(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.eq_ignore_ascii_case("Blockbench.exe"))
        .unwrap_or(false)
}

fn version(executable: &Path) -> Result<String, String> {
    if !is_executable_name(executable) {
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

pub(crate) fn detect() -> BlockbenchState {
    let mut system = System::new_all();
    system.refresh_processes();
    let running = system.processes().values().any(|process| {
        let name = process.name().to_ascii_lowercase();
        name == "blockbench.exe" || name == "blockbench"
    });

    let executable = match discover_executable(&system) {
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

    let version = match version(&executable) {
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

    match evaluate_compatibility(&version) {
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

pub(crate) fn open_model(path: &Path) -> Result<(), String> {
    if !path.is_file() {
        return Err("Model file is unavailable.".to_string());
    }
    let mut system = System::new_all();
    system.refresh_processes();
    let executable = discover_executable(&system)?
        .ok_or_else(|| "Blockbench desktop installation was not found.".to_string())?;
    version(&executable)?;
    Command::new(executable)
        .arg(path)
        .spawn()
        .map_err(|error| format!("Unable to open the model in Blockbench: {error}"))?;
    Ok(())
}

pub(crate) fn open() -> Result<BlockbenchActionResult, String> {
    let mut system = System::new_all();
    system.refresh_processes();
    let already_running = system.processes().values().any(|process| {
        let name = process.name().to_ascii_lowercase();
        name == "blockbench.exe" || name == "blockbench"
    });
    if already_running {
        return Ok(BlockbenchActionResult { status: "ALREADY_RUNNING" });
    }

    let executable = discover_executable(&system)?
        .ok_or_else(|| "Blockbench desktop installation was not found.".to_string())?;
    version(&executable)?;

    Command::new(&executable)
        .spawn()
        .map_err(|error| format!("Unable to open Blockbench: {error}"))?;

    Ok(BlockbenchActionResult { status: "STARTED" })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_manifest_marks_recorded_live_version_validated() {
        let result = evaluate_compatibility("5.2.0").unwrap();
        assert_eq!(result.status, "validated");
        assert!(result.live_validated);
    }

    #[test]
    fn canonical_manifest_requires_review_at_next_family_boundary() {
        let result = evaluate_compatibility("5.3.0").unwrap();
        assert_eq!(result.status, "review-required");
    }

    #[test]
    fn executable_identity_requires_blockbench_filename() {
        assert!(is_executable_name(Path::new("C:/Apps/Blockbench.exe")));
        assert!(!is_executable_name(Path::new("C:/Apps/not-blockbench.exe")));
    }

    #[test]
    fn version_parser_accepts_blockbench_release_and_prerelease_core() {
        assert_eq!(parse_version("5.2.0"), Some((5, 2, 0)));
        assert_eq!(parse_version("5.2.0-beta.2"), Some((5, 2, 0)));
    }
}
