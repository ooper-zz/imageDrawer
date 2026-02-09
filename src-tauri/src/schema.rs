use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub id: String,
    pub label: String,
    pub bin: String,
    #[serde(default)]
    pub args: Vec<Argument>,
    pub command: Vec<String>,
    #[serde(default)]
    pub outputs: Vec<OutputSpec>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub install: Option<InstallHint>,
    #[serde(default)]
    pub group: Option<String>,
    #[serde(default)]
    pub cwd: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default)]
    pub chain: Vec<ChainStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainStep {
    pub label: String,
    pub bin: String,
    pub command: Vec<String>,
    #[serde(default)]
    pub args: Vec<Argument>,
    #[serde(default)]
    pub cwd: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default, rename = "continueOnError")]
    pub continue_on_error: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallHint {
    pub brew: Option<String>,
    #[serde(default)]
    pub cask: Option<bool>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Argument {
    #[serde(rename = "text")]
    Text {
        key: String,
        #[serde(default)]
        required: bool,
        #[serde(default)]
        default: Option<String>,
        #[serde(default)]
        label: Option<String>,
        #[serde(default)]
        placeholder: Option<String>,
    },
    #[serde(rename = "int")]
    Int {
        key: String,
        #[serde(default)]
        required: bool,
        #[serde(default)]
        default: Option<i64>,
        #[serde(default)]
        label: Option<String>,
        #[serde(default)]
        min: Option<i64>,
        #[serde(default)]
        max: Option<i64>,
    },
    #[serde(rename = "float")]
    Float {
        key: String,
        #[serde(default)]
        required: bool,
        #[serde(default)]
        default: Option<f64>,
        #[serde(default)]
        label: Option<String>,
        #[serde(default)]
        min: Option<f64>,
        #[serde(default)]
        max: Option<f64>,
    },
    #[serde(rename = "bool")]
    Bool {
        key: String,
        #[serde(default)]
        default: Option<bool>,
        #[serde(default)]
        label: Option<String>,
    },
    #[serde(rename = "enum")]
    Enum {
        key: String,
        values: Vec<String>,
        #[serde(default)]
        required: bool,
        #[serde(default)]
        default: Option<String>,
        #[serde(default)]
        label: Option<String>,
    },
    #[serde(rename = "file")]
    File {
        key: String,
        #[serde(default)]
        required: bool,
        #[serde(default)]
        label: Option<String>,
        #[serde(default)]
        filters: Option<Vec<FileFilter>>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputSpec {
    pub key: String,
    #[serde(rename = "type")]
    pub output_type: String,
    #[serde(default, rename = "defaultTemplate")]
    pub default_template: Option<String>,
}

impl Argument {
    pub fn key(&self) -> &str {
        match self {
            Argument::Text { key, .. } => key,
            Argument::Int { key, .. } => key,
            Argument::Float { key, .. } => key,
            Argument::Bool { key, .. } => key,
            Argument::Enum { key, .. } => key,
            Argument::File { key, .. } => key,
        }
    }

    pub fn is_required(&self) -> bool {
        match self {
            Argument::Text { required, .. } => *required,
            Argument::Int { required, .. } => *required,
            Argument::Float { required, .. } => *required,
            Argument::Bool { .. } => false,
            Argument::Enum { required, .. } => *required,
            Argument::File { required, .. } => *required,
        }
    }

    pub fn get_default_value(&self) -> Option<serde_json::Value> {
        match self {
            Argument::Text { default, .. } => {
                default.as_ref().map(|v| serde_json::Value::String(v.clone()))
            }
            Argument::Int { default, .. } => {
                default.map(|v| serde_json::Value::Number(v.into()))
            }
            Argument::Float { default, .. } => {
                default.and_then(|v| serde_json::Number::from_f64(v).map(serde_json::Value::Number))
            }
            Argument::Bool { default, .. } => {
                default.map(|v| serde_json::Value::Bool(v))
            }
            Argument::Enum { default, .. } => {
                default.as_ref().map(|v| serde_json::Value::String(v.clone()))
            }
            Argument::File { .. } => None,
        }
    }
}
