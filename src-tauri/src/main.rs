// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod schema;
mod registry;
mod executor;
mod presets;
mod sandbox;

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
};
use std::sync::Mutex;

struct AppState {
    registry: Mutex<registry::ToolRegistry>,
    presets: Mutex<presets::PresetManager>,
}

#[tauri::command]
async fn get_tools(state: tauri::State<'_, AppState>) -> Result<Vec<schema::Tool>, String> {
    let registry = state.registry.lock().map_err(|e| e.to_string())?;
    Ok(registry.get_all_tools())
}

#[tauri::command]
async fn execute_tool(
    tool_id: String,
    params: serde_json::Value,
    state: tauri::State<'_, AppState>,
    window: tauri::Window,
) -> Result<String, String> {
    let tool = {
        let registry = state.registry.lock().map_err(|e| e.to_string())?;
        registry
            .get_tool(&tool_id)
            .ok_or_else(|| format!("Tool not found: {}", tool_id))?
            .clone()
    };

    executor::execute_tool(&tool, params, window).await
}

#[tauri::command]
async fn cancel_execution(execution_id: String) -> Result<(), String> {
    executor::cancel_execution(&execution_id).await
}

#[tauri::command]
async fn validate_binary(bin_name: String) -> Result<String, String> {
    executor::resolve_binary(&bin_name)
}

#[tauri::command]
async fn save_preset(
    tool_id: String,
    preset_name: String,
    params: serde_json::Value,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut presets = state.presets.lock().map_err(|e| e.to_string())?;
    presets.save_preset(&tool_id, &preset_name, params)
}

#[tauri::command]
async fn get_presets(
    tool_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<presets::Preset>, String> {
    let presets = state.presets.lock().map_err(|e| e.to_string())?;
    Ok(presets.get_presets(&tool_id))
}

#[tauri::command]
async fn delete_preset(
    tool_id: String,
    preset_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut presets = state.presets.lock().map_err(|e| e.to_string())?;
    presets.delete_preset(&tool_id, &preset_name)
}

#[tauri::command]
async fn check_binary(bin_name: String) -> Result<bool, String> {
    Ok(executor::resolve_binary(&bin_name).is_ok())
}

#[tauri::command]
async fn install_binary(
    brew_package: String,
    is_cask: bool,
    download_url: Option<String>,
    bin_name: String,
    window: tauri::Window,
) -> Result<String, String> {
    executor::install_tool(&brew_package, is_cask, download_url, &bin_name, window).await
}

#[tauri::command]
async fn get_app_mode() -> Result<String, String> {
    Ok(sandbox::mode_description())
}

#[tauri::command]
async fn save_tool(
    yaml_content: String,
    filename: String,
    subfolder: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let registry = state.registry.lock().map_err(|e| e.to_string())?;
    let tools_dir = registry.get_tools_dir().clone();
    drop(registry);

    let target_dir = if let Some(ref sub) = subfolder {
        let sanitized = sub.replace("..", "").replace("/", std::path::MAIN_SEPARATOR_STR);
        tools_dir.join(sanitized)
    } else {
        tools_dir
    };

    std::fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    // Validate YAML before saving
    let _: schema::Tool = serde_yaml::from_str(&yaml_content)
        .map_err(|e| format!("Invalid tool YAML: {}", e))?;

    let file_path = target_dir.join(&filename);
    std::fs::write(&file_path, &yaml_content)
        .map_err(|e| format!("Failed to write tool file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn get_tools_directory(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let registry = state.registry.lock().map_err(|e| e.to_string())?;
    Ok(registry.get_tools_dir().to_string_lossy().to_string())
}

#[tauri::command]
async fn list_tool_groups(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    let registry = state.registry.lock().map_err(|e| e.to_string())?;
    let tools_dir = registry.get_tools_dir().clone();
    drop(registry);

    let mut groups = Vec::new();
    if tools_dir.exists() {
        collect_subdirs(&tools_dir, &tools_dir, &mut groups);
    }
    groups.sort();
    Ok(groups)
}

fn collect_subdirs(root: &std::path::Path, dir: &std::path::Path, groups: &mut Vec<String>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Ok(rel) = path.strip_prefix(root) {
                    groups.push(rel.to_string_lossy().to_string());
                }
                collect_subdirs(root, &path, groups);
            }
        }
    }
}

#[tauri::command]
async fn reload_tools(state: tauri::State<'_, AppState>) -> Result<Vec<schema::Tool>, String> {
    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;
    registry.reload()?;
    Ok(registry.get_all_tools())
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit CliDeck");
    let show = CustomMenuItem::new("show".to_string(), "Show CliDeck");
    let reload = CustomMenuItem::new("reload".to_string(), "Reload Tools");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(reload)
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(quit);

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "reload" => {
                    let window = app.get_window("main").unwrap();
                    window.emit("reload-tools", ()).unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            // Ensure all app container directories exist
            sandbox::ensure_directories()
                .map_err(|e| format!("Failed to create app directories: {}", e))?;

            eprintln!("CliDeck running in {} mode", sandbox::mode_description());

            let registry = registry::ToolRegistry::new()
                .map_err(|e| format!("Failed to initialize tool registry: {}", e))?;
            let presets = presets::PresetManager::new()
                .map_err(|e| format!("Failed to initialize preset manager: {}", e))?;

            app.manage(AppState {
                registry: Mutex::new(registry),
                presets: Mutex::new(presets),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_tools,
            execute_tool,
            cancel_execution,
            validate_binary,
            check_binary,
            install_binary,
            get_app_mode,
            save_tool,
            get_tools_directory,
            list_tool_groups,
            save_preset,
            get_presets,
            delete_preset,
            reload_tools,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
