use tauri_plugin_dialog::DialogExt;
use tauri_plugin_dialog::FilePath;

#[tauri::command]
async fn pick_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = app.dialog().file().blocking_pick_folder();
    Ok(path.map(|p| match p {
        FilePath::Path(pb) => pb.to_string_lossy().to_string(),
        FilePath::Url(url) => url.to_string(),
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![pick_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
