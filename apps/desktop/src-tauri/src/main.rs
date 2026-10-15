#![cfg_attr(windows, windows_subsystem = "windows")]

#[cfg(all(feature = "native-acceptance", not(debug_assertions)))]
compile_error!("native-acceptance is debug-only and must never ship in a release");

#[cfg(all(feature = "native-acceptance", debug_assertions))]
mod native_acceptance;

mod blockbench;
mod desktop_error;
mod desktop_instance;
mod diagnostics;
mod operation_log;
mod metadata_io;
mod runtime_health;
mod process;
mod project_navigation;
mod readiness;
mod system_status;

use desktop_error::DesktopError;
use diagnostics::DiagnosticExportResult;
use system_status::{BootstrapActionResult, ConnectionStatus, EnsureReadyResult, ManagedActionResult, ManagedUpdateCheck, PluginFileActionResult, ProjectNavigationActionResult, ProjectPathResult, SystemStatus};

#[tauri::command]
fn system_status(app: tauri::AppHandle) -> Result<SystemStatus, DesktopError> {
    #[cfg(all(feature = "native-acceptance", debug_assertions))]
    if native_acceptance::enabled("full-error") {
        return Err(DesktopError::recoverable("ACCEPTANCE_IPC_ERROR", "Injected native full-status rejection".to_string()));
    }
    let mut status = system_status::collect();
    status.bootstrap_available = system_status::bootstrap_available(&app);
    Ok(status)
}

#[tauri::command]
fn connection_status() -> Result<ConnectionStatus, DesktopError> {
    #[cfg(all(feature = "native-acceptance", debug_assertions))]
    if native_acceptance::enabled("probe-error") {
        return Err(DesktopError::recoverable("ACCEPTANCE_IPC_ERROR", "Injected native probe rejection".to_string()));
    }
    Ok(system_status::collect_connection_status())
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

#[cfg(not(all(feature = "native-acceptance", debug_assertions)))]
#[tauri::command]
fn focus_blockbench_window() -> blockbench::BlockbenchFocusResult {
    // Only called from a direct user Open action; never from the status watcher.
    blockbench::focus_window()
}

#[cfg(all(feature = "native-acceptance", debug_assertions))]
#[tauri::command]
async fn focus_blockbench_window() -> blockbench::BlockbenchFocusResult {
    if native_acceptance::enabled("focus-delayed-real") {
        let result = tauri::async_runtime::spawn_blocking(|| {
            std::thread::sleep(std::time::Duration::from_secs(20));
            blockbench::focus_window()
        }).await.unwrap_or(blockbench::BlockbenchFocusResult { status: "UNKNOWN" });
        operation_log::record("acceptance:real-focus", result.status);
        return result;
    }
    for (fault, status) in [("focus-denied", "DENIED"), ("focus-no-window", "NO_WINDOW")] {
        if native_acceptance::enabled(fault) {
            return blockbench::BlockbenchFocusResult { status };
        }
    }
    blockbench::focus_window()
}

#[tauri::command]
fn check_managed_update() -> Result<ManagedUpdateCheck, DesktopError> {
    system_status::check_managed_update()
        .map_err(|message| DesktopError::recoverable("UPDATE_CHECK_FAILED", message))
}

#[tauri::command]
fn managed_action(app: tauri::AppHandle, action: String, expected_source_sha: Option<String>) -> Result<ManagedActionResult, DesktopError> {
    let event = format!("managed:{}", action);
    let result = system_status::run_managed_action(&app, &action, expected_source_sha.as_deref());
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

fn main() {
    let _instance_guard = match desktop_instance::acquire()
        .expect("LazyDesigner Desktop instance ownership failed")
    {
        desktop_instance::InstanceAcquire::Primary(guard) => guard,
        desktop_instance::InstanceAcquire::Secondary => return,
    };

    let pid = std::process::id().to_string();
    operation_log::record("desktop:start", &pid);
    let previous_panic_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        operation_log::record("desktop:panic", &std::process::id().to_string());
        previous_panic_hook(info);
    }));

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            system_status,
            connection_status,
            ensure_ready,
            focus_blockbench_window,
            check_managed_update,
            managed_action,
            bootstrap_install,
            project_navigation_action,
            project_navigation_path,
            show_plugin_file,
            export_diagnostics
        ])
        .build(tauri::generate_context!())
        .expect("error while building LazyDesigner Desktop")
        .run(move |_, event| {
            let name = match event {
                tauri::RunEvent::Ready => "desktop:ready",
                tauri::RunEvent::ExitRequested { .. } => "desktop:exit-requested",
                tauri::RunEvent::Exit => "desktop:exit",
                tauri::RunEvent::WindowEvent { label, event: tauri::WindowEvent::CloseRequested { .. }, .. }
                    if label == "main" => "desktop:close-requested",
                tauri::RunEvent::WindowEvent { label, event: tauri::WindowEvent::Destroyed, .. }
                    if label == "main" => "desktop:destroyed",
                _ => return,
            };
            operation_log::record(name, &pid);
        });
}
