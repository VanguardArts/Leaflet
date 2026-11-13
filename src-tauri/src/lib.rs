// Leaflet — Tauri application entry point.
// Hosts the Leaflet web UI and wires the native dialog + filesystem plugins so
// the app can open/save Netscape bookmark files through the OS file picker.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running Leaflet");
}
