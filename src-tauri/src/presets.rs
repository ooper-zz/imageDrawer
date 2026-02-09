use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Preset {
    pub name: String,
    pub params: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
struct PresetsFile {
    presets: Vec<Preset>,
}

pub struct PresetManager {
    presets_dir: PathBuf,
}

impl PresetManager {
    pub fn new() -> Result<Self, String> {
        let presets_dir = Self::get_presets_directory()?;
        fs::create_dir_all(&presets_dir).map_err(|e| e.to_string())?;

        Ok(Self { presets_dir })
    }

    fn get_presets_directory() -> Result<PathBuf, String> {
        let app_support = dirs::data_local_dir()
            .or_else(|| dirs::home_dir().map(|h| h.join("Library/Application Support")))
            .ok_or_else(|| "Could not find application support directory".to_string())?;

        Ok(app_support.join("CliDeck").join("presets"))
    }

    fn get_preset_file_path(&self, tool_id: &str) -> PathBuf {
        self.presets_dir.join(format!("{}.json", tool_id))
    }

    pub fn save_preset(
        &mut self,
        tool_id: &str,
        preset_name: &str,
        params: serde_json::Value,
    ) -> Result<(), String> {
        let file_path = self.get_preset_file_path(tool_id);

        let mut presets_file = if file_path.exists() {
            let contents = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
            serde_json::from_str::<PresetsFile>(&contents).unwrap_or(PresetsFile {
                presets: Vec::new(),
            })
        } else {
            PresetsFile {
                presets: Vec::new(),
            }
        };

        presets_file
            .presets
            .retain(|p| p.name != preset_name);

        presets_file.presets.push(Preset {
            name: preset_name.to_string(),
            params,
        });

        let json = serde_json::to_string_pretty(&presets_file).map_err(|e| e.to_string())?;
        fs::write(&file_path, json).map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn get_presets(&self, tool_id: &str) -> Vec<Preset> {
        let file_path = self.get_preset_file_path(tool_id);

        if !file_path.exists() {
            return Vec::new();
        }

        let contents = match fs::read_to_string(&file_path) {
            Ok(c) => c,
            Err(_) => return Vec::new(),
        };

        let presets_file: PresetsFile = match serde_json::from_str(&contents) {
            Ok(p) => p,
            Err(_) => return Vec::new(),
        };

        presets_file.presets
    }

    pub fn delete_preset(&mut self, tool_id: &str, preset_name: &str) -> Result<(), String> {
        let file_path = self.get_preset_file_path(tool_id);

        if !file_path.exists() {
            return Err("Preset file not found".to_string());
        }

        let contents = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
        let mut presets_file: PresetsFile =
            serde_json::from_str(&contents).map_err(|e| e.to_string())?;

        presets_file
            .presets
            .retain(|p| p.name != preset_name);

        let json = serde_json::to_string_pretty(&presets_file).map_err(|e| e.to_string())?;
        fs::write(&file_path, json).map_err(|e| e.to_string())?;

        Ok(())
    }
}
