#![cfg_attr(windows, windows_subsystem = "windows")]

mod system_status;

use system_status::SystemStatus;

#[tauri::command]
fn system_status() -> SystemStatus {
    system_status::collect()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![system_status])
        .run(tauri::generate_context!())
        .expect("error while running LazyDesigner Desktop");
}
