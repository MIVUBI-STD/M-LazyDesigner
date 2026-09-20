use serde::{Deserialize, Serialize};
use std::{
    env,
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{SystemTime, UNIX_EPOCH},
};
use sysinfo::{Pid, System};

const INSTANCE_SCHEMA: u8 = 1;
const INSTANCE_DIR_NAME: &str = "desktop-instance";
const OWNER_FILE_NAME: &str = "owner.json";
const MAX_OWNER_BYTES: u64 = 4 * 1024;

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, Eq)]
struct InstanceOwner {
    schema: u8,
    pid: u32,
    process_started_at: u64,
    executable_name: String,
}

pub enum InstanceAcquire {
    Primary(InstanceGuard),
    Secondary,
}

pub struct InstanceGuard {
    directory: PathBuf,
    owner: InstanceOwner,
}

fn observed_at_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().min(u64::MAX as u128) as u64)
        .unwrap_or(0)
}

fn instance_root() -> Result<PathBuf, String> {
    env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|base| base.join("LazyDesigner"))
        .ok_or_else(|| "LOCALAPPDATA is unavailable for Desktop instance ownership.".to_string())
}

fn bounded_executable_name() -> Result<String, String> {
    let path = env::current_exe().map_err(|error| format!("Desktop executable identity is unavailable: {error}"))?;
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .map(str::trim)
        .filter(|value| !value.is_empty() && value.len() <= 128 && !value.chars().any(|ch| ch.is_control()))
        .ok_or_else(|| "Desktop executable identity is invalid.".to_string())?;
    Ok(name.to_string())
}

fn current_owner(system: &System) -> Result<InstanceOwner, String> {
    let pid = std::process::id();
    let process = system
        .process(Pid::from_u32(pid))
        .ok_or_else(|| "Desktop process identity is unavailable.".to_string())?;
    Ok(InstanceOwner {
        schema: INSTANCE_SCHEMA,
        pid,
        process_started_at: process.start_time(),
        executable_name: bounded_executable_name()?,
    })
}

fn owner_matches_identity(owner: &InstanceOwner, pid: u32, started_at: u64, executable_name: &str) -> bool {
    owner.schema == INSTANCE_SCHEMA
        && owner.pid != 0
        && owner.process_started_at != 0
        && owner.pid == pid
        && owner.process_started_at == started_at
        && owner.executable_name.eq_ignore_ascii_case(executable_name)
}

fn owner_process_is_live(owner: &InstanceOwner, system: &System) -> bool {
    let Some(process) = system.process(Pid::from_u32(owner.pid)) else {
        return false;
    };
    owner_matches_identity(owner, owner.pid, process.start_time(), process.name())
}

fn read_owner(directory: &Path) -> Option<InstanceOwner> {
    let path = directory.join(OWNER_FILE_NAME);
    let metadata = fs::metadata(&path).ok()?;
    if !metadata.is_file() || metadata.len() == 0 || metadata.len() > MAX_OWNER_BYTES {
        return None;
    }
    let owner: InstanceOwner = serde_json::from_slice(&fs::read(path).ok()?).ok()?;
    if owner.schema != INSTANCE_SCHEMA
        || owner.pid == 0
        || owner.process_started_at == 0
        || owner.executable_name.is_empty()
        || owner.executable_name.len() > 128
        || owner.executable_name.chars().any(|ch| ch.is_control())
    {
        return None;
    }
    Some(owner)
}

fn write_candidate(directory: &Path, owner: &InstanceOwner) -> Result<(), String> {
    fs::create_dir(directory)
        .map_err(|error| format!("Unable to prepare Desktop instance candidate: {error}"))?;
    let path = directory.join(OWNER_FILE_NAME);
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|error| format!("Unable to create Desktop instance owner: {error}"))?;
    let bytes = serde_json::to_vec(owner)
        .map_err(|error| format!("Unable to encode Desktop instance owner: {error}"))?;
    if bytes.is_empty() || bytes.len() > MAX_OWNER_BYTES as usize {
        let _ = fs::remove_dir_all(directory);
        return Err("Desktop instance owner exceeds the bounded size.".to_string());
    }
    file.write_all(&bytes)
        .and_then(|_| file.sync_all())
        .map_err(|error| format!("Unable to persist Desktop instance owner: {error}"))
}

#[cfg(windows)]
fn focus_existing_process(pid: u32) {
    const SCRIPT: &str = r#"
$targetPid = [int]$args[0]
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class LazyDesignerWindow {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
'@
$process = Get-Process -Id $targetPid -ErrorAction Stop
$handle = $process.MainWindowHandle
if ($handle -ne 0) {
    [LazyDesignerWindow]::ShowWindowAsync($handle, 9) | Out-Null
    [LazyDesignerWindow]::SetForegroundWindow($handle) | Out-Null
}
"#;
    let _ = Command::new("powershell.exe")
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            SCRIPT,
            &pid.to_string(),
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}

#[cfg(not(windows))]
fn focus_existing_process(_pid: u32) {}

pub fn acquire() -> Result<InstanceAcquire, String> {
    let root = instance_root()?;
    fs::create_dir_all(&root)
        .map_err(|error| format!("Unable to prepare Desktop instance directory: {error}"))?;
    let canonical = root.join(INSTANCE_DIR_NAME);

    let mut system = System::new_all();
    system.refresh_processes();
    let owner = current_owner(&system)?;

    for attempt in 0..2 {
        let candidate = root.join(format!(
            ".desktop-instance-{}-{}-{}",
            owner.pid,
            owner.process_started_at,
            observed_at_unix_ms()
        ));
        write_candidate(&candidate, &owner)?;

        match fs::rename(&candidate, &canonical) {
            Ok(()) => {
                return Ok(InstanceAcquire::Primary(InstanceGuard {
                    directory: canonical,
                    owner,
                }));
            }
            Err(error) => {
                let _ = fs::remove_dir_all(&candidate);
                if !canonical.exists() {
                    return Err(format!("Unable to publish Desktop instance owner: {error}"));
                }
            }
        }

        system.refresh_processes();
        if let Some(existing) = read_owner(&canonical) {
            if owner_process_is_live(&existing, &system) {
                focus_existing_process(existing.pid);
                return Ok(InstanceAcquire::Secondary);
            }
        }

        if attempt == 0 {
            let _ = fs::remove_dir_all(&canonical);
            continue;
        }
        return Err("Desktop instance ownership could not be recovered safely.".to_string());
    }

    Err("Desktop instance ownership could not be established.".to_string())
}

impl Drop for InstanceGuard {
    fn drop(&mut self) {
        let Some(current) = read_owner(&self.directory) else {
            return;
        };
        if current == self.owner {
            let _ = fs::remove_dir_all(&self.directory);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn owner_identity_requires_pid_start_time_and_executable_name() {
        let owner = InstanceOwner {
            schema: INSTANCE_SCHEMA,
            pid: 41,
            process_started_at: 99,
            executable_name: "LazyDesigner.exe".to_string(),
        };
        assert!(owner_matches_identity(&owner, 41, 99, "lazydesigner.exe"));
        assert!(!owner_matches_identity(&owner, 42, 99, "LazyDesigner.exe"));
        assert!(!owner_matches_identity(&owner, 41, 100, "LazyDesigner.exe"));
        assert!(!owner_matches_identity(&owner, 41, 99, "Blockbench.exe"));
    }

    #[test]
    fn malformed_owner_files_fail_closed() {
        let root = std::env::temp_dir().join(format!(
            "lazydesigner-instance-owner-{}-{}",
            std::process::id(),
            observed_at_unix_ms()
        ));
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join(OWNER_FILE_NAME), b"{not-json").unwrap();
        assert!(read_owner(&root).is_none());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn candidate_owner_is_complete_before_publish() {
        let root = std::env::temp_dir().join(format!(
            "lazydesigner-instance-candidate-{}-{}",
            std::process::id(),
            observed_at_unix_ms()
        ));
        let owner = InstanceOwner {
            schema: INSTANCE_SCHEMA,
            pid: 7,
            process_started_at: 11,
            executable_name: "LazyDesigner.exe".to_string(),
        };
        write_candidate(&root, &owner).unwrap();
        assert_eq!(read_owner(&root), Some(owner));
        fs::remove_dir_all(root).unwrap();
    }
}
