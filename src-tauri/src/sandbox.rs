use std::fs;
use std::path::PathBuf;

/// Check if the app is running inside an App Sandbox container.
/// Sandboxed apps have HOME set to ~/Library/Containers/<bundle-id>/Data
pub fn is_sandboxed() -> bool {
    if let Ok(home) = std::env::var("HOME") {
        home.contains("/Library/Containers/")
    } else {
        false
    }
}

/// Get the app container directory for storing tools and data.
/// - Sandboxed: ~/Library/Containers/com.clideck.app/Data/Library/Application Support/CliDeck/
/// - Unsandboxed: ~/Library/Application Support/CliDeck/
pub fn app_data_dir() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| d.join("CliDeck"))
}

/// Get the directory where user-installed tool binaries are stored.
/// This is inside the app's writable container.
pub fn user_tools_bin_dir() -> Option<PathBuf> {
    app_data_dir().map(|d| d.join("bin"))
}

/// Get the directory where downloaded tool archives are cached.
pub fn downloads_cache_dir() -> Option<PathBuf> {
    app_data_dir().map(|d| d.join("cache"))
}

/// Get the bundled tools directory (inside the .app bundle Resources).
/// Only available in release builds.
pub fn bundled_tools_dir() -> Option<PathBuf> {
    // In a bundled macOS app, the executable is at:
    //   CliDeck.app/Contents/MacOS/CliDeck
    // Resources are at:
    //   CliDeck.app/Contents/Resources/
    if let Ok(exe) = std::env::current_exe() {
        let resources = exe
            .parent()? // MacOS/
            .parent()? // Contents/
            .join("Resources")
            .join("tools");
        if resources.exists() {
            return Some(resources);
        }
    }
    None
}

/// Ensure all required directories exist.
pub fn ensure_directories() -> Result<(), String> {
    let dirs_to_create = [
        app_data_dir(),
        user_tools_bin_dir(),
        downloads_cache_dir(),
        app_data_dir().map(|d| d.join("tools")),
        app_data_dir().map(|d| d.join("presets")),
    ];

    for dir in dirs_to_create.iter().flatten() {
        fs::create_dir_all(dir).map_err(|e| format!("Failed to create directory {:?}: {}", dir, e))?;
    }

    Ok(())
}

/// Get the execution mode description for display.
pub fn mode_description() -> String {
    if is_sandboxed() {
        "App Store (sandboxed)".to_string()
    } else {
        "Development (unsandboxed)".to_string()
    }
}
