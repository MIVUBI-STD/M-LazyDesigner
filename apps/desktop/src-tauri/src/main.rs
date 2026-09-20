#![cfg_attr(windows, windows_subsystem = "windows")]

mod desktop_error;
mod diagnostics;
mod operation_log;
mod process;
mod system_status;

use desktop_error::DesktopError;
use diagnostics::DiagnosticExportResult;
use tauri::Manager;
use system_status::{BootstrapActionResult, ConnectionStatus, EnsureReadyResult, ManagedActionResult, PluginFileActionResult, ProjectNavigationActionResult, ProjectPathResult, SystemStatus};

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
    let result = system_status::ensure_ready(&app);
    match &result {
        Ok(value) if value.status == "NEEDS_ATTENTION" => {
            operation_log::record("ensure_ready", value.reason);
        }
        Ok(value) => {
            operation_log::record("ensure_ready", value.status);
        }
        Err(_) => {
            operation_log::record("ensure_ready", "ERROR");
        }
    }
    result.map_err(|message| DesktopError::recoverable("ENSURE_READY_FAILED", message))
}

#[tauri::command]
fn managed_action(app: tauri::AppHandle, action: String) -> Result<ManagedActionResult, DesktopError> {
    let event = format!("managed:{}", action);
    let result = system_status::run_managed_action(&app, &action);
    match &result {
        Ok(value) => {
            let outcome = value.receipt
                .get("status")
                .and_then(|status| status.as_str())
                .unwrap_or("COMPLETE");
            operation_log::record(&event, outcome);
        }
        Err(_) => operation_log::record(&event, "ERROR"),
    }
    result.map_err(|message| DesktopError::recoverable("MANAGED_ACTION_FAILED", message))
}

#[tauri::command]
fn bootstrap_install(app: tauri::AppHandle) -> Result<BootstrapActionResult, DesktopError> {
    let result = system_status::bootstrap_install(&app);
    operation_log::record("bootstrap_install", if result.is_ok() { "ok" } else { "error" });
    result.map_err(|message| DesktopError::recoverable("BOOTSTRAP_INSTALL_FAILED", message))
}

#[tauri::command]
fn project_navigation_action(action: String, id: String) -> Result<ProjectNavigationActionResult, DesktopError> {
    let result = system_status::project_navigation_action(&action, &id);
    operation_log::record(
        &format!("project:{}", action),
        if result.is_ok() { "OK" } else { "ERROR" },
    );
    result.map_err(|message| DesktopError::recoverable("PROJECT_NAVIGATION_FAILED", message))
}

#[tauri::command]
fn project_navigation_path(id: String) -> Result<ProjectPathResult, DesktopError> {
    system_status::project_navigation_path(&id)
        .map_err(|message| DesktopError::recoverable("PROJECT_PATH_FAILED", message))
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

fn focus_existing_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            focus_existing_window(app);
        }))
        .invoke_handler(tauri::generate_handler![
            system_status,
            connection_status,
            ensure_ready,
            managed_action,
            bootstrap_install,
            project_navigation_action,
            project_navigation_path,
            show_plugin_file,
            export_diagnostics
        ])
        .run(tauri::generate_context!())
        .expect("error while running LazyDesigner Desktop");
}
