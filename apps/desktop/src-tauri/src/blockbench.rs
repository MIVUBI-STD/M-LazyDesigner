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
    live_validated_builds: Vec<ValidatedBlockbenchBuild>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ValidatedBlockbenchBuild {
    version: String,
    build_identity: String,
}

fn matches_live_validated_build(
    version: &str,
    build_identity: Option<&str>,
    entries: &[ValidatedBlockbenchBuild],
) -> bool {
    let Some(build) = build_identity.filter(|value| {
        value.len() == 71 && value.starts_with("sha256:") &&
        value[7..].bytes().all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
    }) else {
        return false;
    };
    entries.iter().any(|entry|
        entry.version == version && entry.build_identity == build
    )
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

/// Outcome of an explicit user-requested editor-window focus attempt.
/// Never treat opening a process or issuing a Win32 request as verified foreground focus.
#[derive(Debug, Serialize)]
pub struct BlockbenchFocusResult {
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

fn evaluate_compatibility_for_build(
    version: &str,
    runtime_build_identity: Option<&str>,
) -> Result<BlockbenchCompatibility, String> {
    let manifest = compatibility_manifest()?;
    let parsed = parse_version(version);
    let minimum = parse_version(&manifest.minimum_version)
        .ok_or_else(|| "Invalid minimum Blockbench compatibility version.".to_string())?;
    let review = parse_version(&manifest.review_boundary_version)
        .ok_or_else(|| "Invalid Blockbench review boundary version.".to_string())?;
    let live_validated = matches_live_validated_build(
        version, runtime_build_identity, &manifest.live_validated_builds,
    );

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

// Version discovery is available even while Blockbench is closed. Without a
// verified native Runtime identity Desktop must report compatible-unverified.
pub(crate) fn evaluate_compatibility(version: &str) -> Result<BlockbenchCompatibility, String> {
    evaluate_compatibility_for_build(version, None)
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


#[cfg(windows)]
mod window_focus {
    use std::{collections::HashSet, ffi::c_void};

    type Hwnd = *mut c_void;
    const GW_OWNER: u32 = 4;
    const SW_RESTORE: i32 = 9;

    #[link(name = "user32")]
    unsafe extern "system" {
        fn EnumWindows(callback: Option<unsafe extern "system" fn(Hwnd, isize) -> i32>, param: isize) -> i32;
        fn GetWindowThreadProcessId(window: Hwnd, process_id: *mut u32) -> u32;
        fn IsWindowVisible(window: Hwnd) -> i32;
        fn GetWindow(window: Hwnd, command: u32) -> Hwnd;
        fn GetWindowTextLengthW(window: Hwnd) -> i32;
        fn GetForegroundWindow() -> Hwnd;
        fn ShowWindowAsync(window: Hwnd, command: i32) -> i32;
        fn SetForegroundWindow(window: Hwnd) -> i32;
    }

    struct Candidates<'a> {
        allowed_pids: &'a HashSet<u32>,
        windows: Vec<Hwnd>,
    }

    unsafe extern "system" fn collect_window(window: Hwnd, parameter: isize) -> i32 {
        let candidates = &mut *(parameter as *mut Candidates<'_>);
        // Only visible, unowned top-level windows with a title can be candidates.
        // Do not search by window title: another application can use the same title.
        if IsWindowVisible(window) == 0
            || !GetWindow(window, GW_OWNER).is_null()
            || GetWindowTextLengthW(window) <= 0
        {
            return 1;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(window, &mut pid);
        if candidates.allowed_pids.contains(&pid) {
            candidates.windows.push(window);
        }
        1
    }

    // The same selection function is used by production and regression tests.
    fn unique_target<T: Copy>(windows: &[T]) -> Result<T, &'static str> {
        match windows {
            [] => Err("NO_WINDOW"),
            [window] => Ok(*window),
            _ => Err("AMBIGUOUS"),
        }
    }

    pub(super) fn focus(allowed_pids: &HashSet<u32>) -> &'static str {
        let mut candidates = Candidates { allowed_pids, windows: Vec::new() };
        let listed = unsafe { EnumWindows(Some(collect_window), &mut candidates as *mut _ as isize) };
        if listed == 0 {
            return "UNKNOWN";
        }
        // Multiple Blockbench windows/profiles must not be guessed from ordering.
        let target = match unique_target(&candidates.windows) {
            Ok(window) => window,
            Err(reason) => return reason,
        };
        unsafe {
            if GetForegroundWindow() == target {
                return "FOCUSED";
            }
            let _ = ShowWindowAsync(target, SW_RESTORE);
            let _ = SetForegroundWindow(target);
            if GetForegroundWindow() == target { "FOCUSED" } else { "DENIED" }
        }
    }

    #[cfg(test)]
    mod tests {
        #[test]
        fn window_choice_must_be_unambiguous() {
            assert_eq!(super::unique_target::<usize>(&[]), Err("NO_WINDOW"));
            assert_eq!(super::unique_target(&[11usize]), Ok(11));
            assert_eq!(super::unique_target(&[11usize, 12]), Err("AMBIGUOUS"));
        }
    }
}

/// Best-effort, explicit window focus; does not start a new Blockbench process.
/// The caller must handle non-FOCUSED outcomes without claiming a foreground switch.
pub(crate) fn focus_window() -> BlockbenchFocusResult {
    #[cfg(windows)]
    {
        use std::collections::HashSet;
        let mut system = System::new_all();
        system.refresh_processes();
        let allowed: HashSet<u32> = system.processes().iter()
            .filter(|(_, process)| {
                let name = process.name().to_ascii_lowercase();
                (name == "blockbench.exe" || name == "blockbench")
                    && process.exe().is_some_and(|path| path.is_file() && is_executable_name(path))
            })
            .map(|(pid, _)| pid.as_u32())
            .collect();
        return BlockbenchFocusResult {
            status: if allowed.is_empty() { "NOT_RUNNING" } else { window_focus::focus(&allowed) },
        };
    }
    #[cfg(not(windows))]
    {
        BlockbenchFocusResult { status: "UNSUPPORTED" }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn historical_editor_version_does_not_validate_current_bundle() {
        let result = evaluate_compatibility("5.2.0").unwrap();
        assert_eq!(result.status, "compatible-unverified");
        assert!(!result.live_validated);
        assert_eq!(evaluate_compatibility("5.2.2").unwrap().status, "compatible-unverified");
    }

    #[test]
    fn native_bundle_validation_needs_both_exact_version_and_build() {
        let build = format!("sha256:{}", "a".repeat(64));
        let entries = vec![ValidatedBlockbenchBuild {
            version: "5.2.2".to_string(), build_identity: build.clone(),
        }];
        assert!(matches_live_validated_build("5.2.2", Some(&build), &entries));
        assert!(!matches_live_validated_build("5.2.0", Some(&build), &entries));
        assert!(!matches_live_validated_build("5.2.2", None, &entries));
        assert!(!matches_live_validated_build("5.2.2", Some("source"), &entries));
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
