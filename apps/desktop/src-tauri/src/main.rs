#![cfg_attr(windows, windows_subsystem = "windows")]

mod desktop_error;
mod diagnostics;
mod process;
mod system_status;

use desktop_error::DesktopError;
use diagnostics::DiagnosticExportResult;
use system_status::{BlockbenchActionResult, BootstrapActionResult, ConnectionStatus, EnsureReadyResult, ManagedActionResult, PluginFileActionResult, SystemStatus};

#[tauri::command]
fn system_status(app: tauri::AppHandle) -> SystemStatus {
    let mut status = system_status::collect();
    status.bootstrap_available = system_status::bootstrap_available(&app);
    status
}

#[tauri::command]
fn connection_status() -> ConnectionStatus {
    system_status::collect_connection_status()
}

#[tauri::command]
fn ensure_ready(app: tauri::AppHandle) -> Result<EnsureReadyResult, DesktopError> {
    system_status::ensure_ready(&app)
        .map_err(|message| DesktopError::recoverable("ENSURE_READY_FAILED", message))
}

#[tauri::command]
fn managed_action(app: tauri::AppHandle, action: String) -> Result<ManagedActionResult, DesktopError> {
    system_status::run_managed_action(&app, &action)
        .map_err(|message| DesktopError::recoverable("MANAGED_ACTION_FAILED", message))
}

#[tauri::command]
fn open_blockbench() -> Result<BlockbenchActionResult, DesktopError> {
    system_status::open_blockbench()
        .map_err(|message| DesktopError::recoverable("BLOCKBENCH_OPEN_FAILED", message))
}

#[tauri::command]
fn bootstrap_install(app: tauri::AppHandle) -> Result<BootstrapActionResult, DesktopError> {
    system_status::bootstrap_install(&app)
        .map_err(|message| DesktopError::recoverable("BOOTSTRAP_INSTALL_FAILED", message))
}

#[tauri::command]
fn show_plugin_file() -> Result<PluginFileActionResult, DesktopError> {
    system_status::show_plugin_file()
        .map_err(|message| DesktopError::recoverable("PLUGIN_FILE_FAILED", message))
}

#[tauri::command]
fn export_diagnostics() -> Result<DiagnosticExportResult, DesktopError> {
    diagnostics::export()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            system_status,
            connection_status,
            ensure_ready,
            managed_action,
            open_blockbench,
            bootstrap_install,
            show_plugin_file,
            export_diagnostics
        ])
        .run(tauri::generate_context!())
        .expect("error while running LazyDesigner Desktop");
}
