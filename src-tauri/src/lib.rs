#[tauri::command]
async fn run_pdflatex(target_dir: &str, file_name: &str) -> Result<String, String> {
    use std::process::Command;
    
    let path_env = std::env::var("PATH").unwrap_or_else(|_| "".to_string());
    let new_path = format!("{}:{}", "/Library/TeX/texbin:/opt/homebrew/bin:/usr/local/bin", path_env);

    let output = Command::new("pdflatex")
        .env("PATH", new_path)
        .current_dir(target_dir)
        .arg("-interaction=nonstopmode")
        .arg("-halt-on-error")
        .arg(file_name)
        .output()
        .map_err(|e| format!("Failed to execute pdflatex. Is it in your PATH? Error: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    
    if output.status.success() {
        Ok(stdout)
    } else {
        Err(stdout)
    }
}

#[tauri::command]
async fn read_file_bytes(path: &str) -> Result<Vec<u8>, String> {
    std::fs::read(path).map_err(|e| format!("Failed to read file: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![run_pdflatex, read_file_bytes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
