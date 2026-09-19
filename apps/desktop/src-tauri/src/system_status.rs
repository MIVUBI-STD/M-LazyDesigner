use serde::Serialize;
use serde_json::Value;
use std::{
    env,
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use sysinfo::System;

#[derive(Debug, Serialize)]
pub struct SystemStatus {
    pub schema: u8,
    pub blockbench_running: bool,
    pub manager_available: bool,
    pub managed: Option<Value>,
    pub diagnostic: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
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

fn blockbench_running() -> bool {
    let mut system = System::new_all();
    system.refresh_processes();
    system.processes().values().any(|process| {
        let name = process.name().to_ascii_lowercase();
        name == "blockbench.exe" || name == "blockbench"
    })
}

pub fn collect() -> SystemStatus {
    let running = blockbench_running();
    let Some(root) = managed_root() else {
        return SystemStatus {
            schema: 1,
            blockbench_running: running,
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
                blockbench_running: running,
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
                blockbench_running: running,
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
            blockbench_running: running,
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
        Ok(managed) => SystemStatus {
            schema: 1,
            blockbench_running: running,
            manager_available: true,
            managed: Some(managed),
            diagnostic: None,
        },
        Err(_) => SystemStatus {
            schema: 1,
            blockbench_running: running,
            manager_available: true,
            managed: None,
            diagnostic: Some("Managed status returned invalid JSON.".to_string()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_installation_is_diagnostic_not_panic() {
        let result = manager_executable(Path::new("Z:/definitely-missing-lazydesigner-root"));
        assert!(result.is_err());
    }
}
