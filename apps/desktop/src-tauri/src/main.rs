#![cfg_attr(windows, windows_subsystem = "windows")]

mod system_status;

use system_status::{ManagedActionResult, SystemStatus};

#[tauri::command]
fn system_status() -> SystemStatus {
    system_status::collect()
}

#[tauri::command]
fn managed_action(action: String) -> Result<ManagedActionResult, String> {
    system_status::run_managed_action(&action)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![system_status, managed_action])
        .run(tauri::generate_context!())
        .expect("error while running LazyDesigner Desktop");
}
