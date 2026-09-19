#![cfg_attr(windows, windows_subsystem = "windows")]

mod system_status;

use system_status::{BlockbenchActionResult, BootstrapActionResult, ManagedActionResult, SystemStatus};

#[tauri::command]
fn system_status(app: tauri::AppHandle) -> SystemStatus {
    let mut status = system_status::collect();
    status.bootstrap_available = system_status::bootstrap_available(&app);
    status
}

#[tauri::command]
fn managed_action(action: String) -> Result<ManagedActionResult, String> {
    system_status::run_managed_action(&action)
}

#[tauri::command]
fn open_blockbench() -> Result<BlockbenchActionResult, String> {
    system_status::open_blockbench()
}

#[tauri::command]
fn bootstrap_install(app: tauri::AppHandle) -> Result<BootstrapActionResult, String> {
    system_status::bootstrap_install(&app)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![system_status, managed_action, open_blockbench, bootstrap_install])
        .run(tauri::generate_context!())
        .expect("error while running LazyDesigner Desktop");
}
