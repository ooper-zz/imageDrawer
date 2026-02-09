use crate::schema::Tool;
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RegistryError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("YAML parse error: {0}")]
    Yaml(#[from] serde_yaml::Error),
    #[error("Tools directory not found")]
    ToolsDirNotFound,
}

pub struct ToolRegistry {
    tools: Vec<Tool>,
    tools_dir: PathBuf,
}

impl ToolRegistry {
    pub fn new() -> Result<Self, RegistryError> {
        let tools_dir = Self::get_tools_directory()?;
        
        fs::create_dir_all(&tools_dir)?;
        
        let mut registry = Self {
            tools: Vec::new(),
            tools_dir,
        };
        
        registry.load_tools()?;
        Ok(registry)
    }

    fn get_tools_directory() -> Result<PathBuf, RegistryError> {
        let app_support = dirs::data_local_dir()
            .or_else(|| dirs::home_dir().map(|h| h.join("Library/Application Support")))
            .ok_or(RegistryError::ToolsDirNotFound)?;
        
        Ok(app_support.join("CliDeck").join("tools"))
    }

    fn load_tools(&mut self) -> Result<(), RegistryError> {
        self.tools.clear();
        let mut loaded_ids = std::collections::HashSet::new();

        // Load from user tools directory first (takes priority)
        self.load_tools_from_dir(&self.tools_dir.clone(), &mut loaded_ids)?;

        // Also load from bundled tools in .app Resources
        if let Some(bundled_dir) = crate::sandbox::bundled_tools_dir() {
            self.load_tools_from_dir(&bundled_dir, &mut loaded_ids)?;
        }

        Ok(())
    }

    fn load_tools_from_dir(
        &mut self,
        dir: &std::path::Path,
        loaded_ids: &mut std::collections::HashSet<String>,
    ) -> Result<(), RegistryError> {
        self.load_tools_from_dir_recursive(dir, dir, loaded_ids)
    }

    fn load_tools_from_dir_recursive(
        &mut self,
        root_dir: &std::path::Path,
        dir: &std::path::Path,
        loaded_ids: &mut std::collections::HashSet<String>,
    ) -> Result<(), RegistryError> {
        if !dir.exists() {
            return Ok(());
        }

        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                self.load_tools_from_dir_recursive(root_dir, &path, loaded_ids)?;
            } else if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "yaml" || ext == "yml" {
                        match self.load_tool_from_file(&path) {
                            Ok(mut tool) => {
                                // Auto-derive group from subfolder name if not set in YAML
                                if tool.group.is_none() {
                                    if let Some(parent) = path.parent() {
                                        if parent != root_dir {
                                            if let Ok(rel) = parent.strip_prefix(root_dir) {
                                                let group_name = rel.to_string_lossy().to_string();
                                                if !group_name.is_empty() {
                                                    tool.group = Some(group_name);
                                                }
                                            }
                                        }
                                    }
                                }
                                if !loaded_ids.contains(&tool.id) {
                                    loaded_ids.insert(tool.id.clone());
                                    self.tools.push(tool);
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to load tool from {:?}: {}", path, e);
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    fn load_tool_from_file(&self, path: &PathBuf) -> Result<Tool, RegistryError> {
        let contents = fs::read_to_string(path)?;
        let tool: Tool = serde_yaml::from_str(&contents)?;
        Ok(tool)
    }

    pub fn get_all_tools(&self) -> Vec<Tool> {
        self.tools.clone()
    }

    pub fn get_tool(&self, id: &str) -> Option<&Tool> {
        self.tools.iter().find(|t| t.id == id)
    }

    pub fn reload(&mut self) -> Result<(), String> {
        self.load_tools().map_err(|e| e.to_string())
    }

    pub fn get_tools_dir(&self) -> &PathBuf {
        &self.tools_dir
    }
}
