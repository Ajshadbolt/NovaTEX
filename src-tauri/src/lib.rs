use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BuildOutput {
    engine: String,
    log: String,
    output_pdf: String,
}

fn merge_output(output: &std::process::Output) -> String {
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    match (stdout.trim().is_empty(), stderr.trim().is_empty()) {
        (false, false) => format!("{}\n{}", stdout, stderr),
        (false, true) => stdout,
        (true, false) => stderr,
        (true, true) => String::new(),
    }
}

fn pdf_name_for(file_name: &str) -> String {
    std::path::Path::new(file_name)
        .with_extension("pdf")
        .to_string_lossy()
        .to_string()
}

#[tauri::command]
async fn run_latex_build(target_dir: &str, file_name: &str) -> Result<BuildOutput, String> {
    use std::process::Command;
    
    let path_env = std::env::var("PATH").unwrap_or_else(|_| "".to_string());
    let new_path = format!("{}:{}", "/Library/TeX/texbin:/opt/homebrew/bin:/usr/local/bin", path_env);
    let output_pdf = pdf_name_for(file_name);

    match Command::new("latexmk")
        .env("PATH", &new_path)
        .current_dir(target_dir)
        .arg("-pdf")
        .arg("-interaction=nonstopmode")
        .arg("-halt-on-error")
        .arg("-synctex=1")
        .arg(file_name)
        .output()
    {
        Ok(output) => {
            let log = merge_output(&output);
            if output.status.success() {
                return Ok(BuildOutput {
                    engine: "latexmk".into(),
                    log,
                    output_pdf,
                });
            }

            return Err(log);
        }
        Err(err) if err.kind() != std::io::ErrorKind::NotFound => {
            return Err(format!("Failed to execute latexmk: {}", err));
        }
        Err(_) => {}
    }

    let mut combined_log = String::new();
    for pass in 1..=2 {
        let output = Command::new("pdflatex")
            .env("PATH", &new_path)
            .current_dir(target_dir)
            .arg("-interaction=nonstopmode")
            .arg("-halt-on-error")
            .arg("-synctex=1")
            .arg(file_name)
            .output()
            .map_err(|e| format!("Failed to execute pdflatex. Is it in your PATH? Error: {}", e))?;

        combined_log.push_str(&format!("pdflatex pass {}\n{}\n", pass, merge_output(&output)));

        if !output.status.success() {
            return Err(combined_log);
        }
    }

    Ok(BuildOutput {
        engine: "pdflatex (2-pass fallback)".into(),
        log: combined_log,
        output_pdf,
    })
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
        .invoke_handler(tauri::generate_handler![run_latex_build, read_file_bytes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
