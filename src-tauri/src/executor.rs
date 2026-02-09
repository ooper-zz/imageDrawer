use crate::schema::{Argument, ChainStep, Tool};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

lazy_static::lazy_static! {
    static ref RUNNING_PROCESSES: Arc<Mutex<HashMap<String, tokio::process::Child>>> = 
        Arc::new(Mutex::new(HashMap::new()));
}

#[derive(serde::Serialize, Clone)]
struct ExecutionOutput {
    #[serde(rename = "type")]
    output_type: String,
    data: String,
}

pub async fn execute_tool(
    tool: &Tool,
    params: Value,
    window: tauri::Window,
) -> Result<String, String> {
    // If the tool has a chain, execute it as a multi-step pipeline
    if !tool.chain.is_empty() {
        return execute_chain(tool, params, window).await;
    }

    let execution_id = uuid::Uuid::new_v4().to_string();
    
    let params_map = params
        .as_object()
        .ok_or_else(|| "Parameters must be an object".to_string())?;

    validate_params(tool, params_map)?;

    let binary_path = resolve_binary(&tool.bin)?;

    let mut context = build_context(tool, params_map)?;
    context.insert("bin".to_string(), binary_path.clone());

    let args = expand_command_template(&tool.command, &context)?;

    emit_output(&window, &execution_id, "info", &format!("Executing: {} {}", binary_path, args.join(" ")));

    // Skip the first element of the command template (the {bin} placeholder)
    // since we pass binary_path to Command::new directly
    let cmd_args = if !args.is_empty() { &args[1..] } else { &args[..] };

    let mut cmd = Command::new(&binary_path);
    cmd.args(cmd_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(ref cwd) = tool.cwd {
        apply_cwd(&mut cmd, cwd, &window, &execution_id)?;
    }

    // Apply environment variables
    if !tool.env.is_empty() {
        let expanded_env = expand_env_map(&tool.env, &context)?;
        cmd.envs(&expanded_env);
        for (k, v) in &expanded_env {
            emit_output(&window, &execution_id, "info", &format!("env: {}={}", k, v));
        }
    }

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    // Store the child so it can be cancelled later
    {
        let mut processes = RUNNING_PROCESSES.lock().await;
        processes.insert(execution_id.clone(), child);
    }

    stream_and_wait(stdout, stderr, window, execution_id.clone());

    Ok(execution_id)
}

/// Execute a chain of steps sequentially under one execution_id
async fn execute_chain(
    tool: &Tool,
    params: Value,
    window: tauri::Window,
) -> Result<String, String> {
    let execution_id = uuid::Uuid::new_v4().to_string();

    let params_map = params
        .as_object()
        .ok_or_else(|| "Parameters must be an object".to_string())?;

    // Validate top-level args
    validate_params(tool, params_map)?;

    let top_context = build_context(tool, params_map)?;
    let total = tool.chain.len();

    emit_output(
        &window,
        &execution_id,
        "info",
        &format!("Starting chain: {} ({} steps)", tool.label, total),
    );

    // Clone what we need for the spawned task
    let chain = tool.chain.clone();
    let tool_cwd = tool.cwd.clone();
    let tool_env = tool.env.clone();
    let exec_id = execution_id.clone();
    let win = window.clone();

    tokio::spawn(async move {
        for (i, step) in chain.iter().enumerate() {
            let step_num = i + 1;
            emit_output(
                &win,
                &exec_id,
                "info",
                &format!("\n━━━ Step {}/{}: {} ━━━", step_num, total, step.label),
            );

            match run_chain_step(&step, &top_context, &tool_cwd, &tool_env, &exec_id, &win).await {
                Ok(exit_code) => {
                    if exit_code != 0 {
                        emit_output(
                            &win,
                            &exec_id,
                            "stderr",
                            &format!("Step '{}' failed with exit code: {}", step.label, exit_code),
                        );
                        if !step.continue_on_error {
                            emit_output(
                                &win,
                                &exec_id,
                                "exit",
                                &format!("Chain aborted at step {}/{} (exit code: {})", step_num, total, exit_code),
                            );
                            return;
                        }
                        emit_output(&win, &exec_id, "info", "continueOnError=true, proceeding...");
                    } else {
                        emit_output(
                            &win,
                            &exec_id,
                            "info",
                            &format!("Step '{}' completed successfully", step.label),
                        );
                    }
                }
                Err(e) => {
                    emit_output(&win, &exec_id, "error", &format!("Step '{}' error: {}", step.label, e));
                    if !step.continue_on_error {
                        emit_output(
                            &win,
                            &exec_id,
                            "exit",
                            &format!("Chain aborted at step {}/{}", step_num, total),
                        );
                        return;
                    }
                }
            }
        }

        emit_output(
            &win,
            &exec_id,
            "exit",
            &format!("Chain completed: all {} steps finished", total),
        );
    });

    Ok(execution_id)
}

/// Run a single chain step synchronously (awaits completion)
async fn run_chain_step(
    step: &ChainStep,
    parent_context: &HashMap<String, String>,
    parent_cwd: &Option<String>,
    parent_env: &HashMap<String, String>,
    execution_id: &str,
    window: &tauri::Window,
) -> Result<i32, String> {
    let binary_path = resolve_binary(&step.bin)?;

    // Build context: start with parent context, then overlay step-specific args
    let mut context = parent_context.clone();
    context.insert("bin".to_string(), binary_path.clone());

    let args = expand_command_template(&step.command, &context)?;
    let cmd_args = if !args.is_empty() { &args[1..] } else { &args[..] };

    emit_output(window, execution_id, "info", &format!("Executing: {} {}", binary_path, args.join(" ")));

    let mut cmd = Command::new(&binary_path);
    cmd.args(cmd_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // cwd: step overrides parent
    let effective_cwd = step.cwd.as_ref().or(parent_cwd.as_ref());
    if let Some(cwd) = effective_cwd {
        apply_cwd(&mut cmd, cwd, window, execution_id)?;
    }

    // env: merge parent env + step env (step wins), then expand placeholders
    let mut merged_env = parent_env.clone();
    for (k, v) in &step.env {
        merged_env.insert(k.clone(), v.clone());
    }
    if !merged_env.is_empty() {
        let expanded_env = expand_env_map(&merged_env, &context)?;
        cmd.envs(&expanded_env);
    }

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    // Stream output in background tasks
    let win1 = window.clone();
    let eid1 = execution_id.to_string();
    let stdout_handle = tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            emit_output(&win1, &eid1, "stdout", &line);
        }
    });

    let win2 = window.clone();
    let eid2 = execution_id.to_string();
    let stderr_handle = tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            emit_output(&win2, &eid2, "stderr", &line);
        }
    });

    // Wait for process to complete
    let status = child.wait().await
        .map_err(|e| format!("Failed to wait for process: {}", e))?;

    // Wait for output streams to flush
    let _ = stdout_handle.await;
    let _ = stderr_handle.await;

    Ok(status.code().unwrap_or(-1))
}

/// Apply cwd to a Command, validating the directory exists
fn apply_cwd(
    cmd: &mut Command,
    cwd: &str,
    window: &tauri::Window,
    execution_id: &str,
) -> Result<(), String> {
    let cwd_path = Path::new(cwd);
    if cwd_path.exists() && cwd_path.is_dir() {
        emit_output(window, execution_id, "info", &format!("Working directory: {}", cwd));
        cmd.current_dir(cwd_path);
        Ok(())
    } else {
        Err(format!("Working directory does not exist: {}", cwd))
    }
}

/// Expand placeholders in an env map
fn expand_env_map(
    env: &HashMap<String, String>,
    context: &HashMap<String, String>,
) -> Result<HashMap<String, String>, String> {
    let mut result = HashMap::new();
    for (key, value) in env {
        let expanded = expand_template(value, context)?;
        result.insert(key.clone(), expanded);
    }
    Ok(result)
}

/// Spawn background tasks to stream stdout/stderr and wait for exit
fn stream_and_wait(
    stdout: tokio::process::ChildStdout,
    stderr: tokio::process::ChildStderr,
    window: tauri::Window,
    execution_id: String,
) {
    let window_clone = window.clone();
    let exec_id_clone = execution_id.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            emit_output(&window_clone, &exec_id_clone, "stdout", &line);
        }
    });

    let window_clone = window.clone();
    let exec_id_clone = execution_id.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            emit_output(&window_clone, &exec_id_clone, "stderr", &line);
        }
    });

    let exec_id_clone = execution_id.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            let mut processes = RUNNING_PROCESSES.lock().await;
            if let Some(child) = processes.get_mut(&exec_id_clone) {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        processes.remove(&exec_id_clone);
                        let exit_code = status.code().unwrap_or(-1);
                        emit_output(
                            &window,
                            &exec_id_clone,
                            "exit",
                            &format!("Process exited with code: {}", exit_code),
                        );
                        break;
                    }
                    Ok(None) => {}
                    Err(e) => {
                        processes.remove(&exec_id_clone);
                        emit_output(
                            &window,
                            &exec_id_clone,
                            "error",
                            &format!("Process error: {}", e),
                        );
                        break;
                    }
                }
            } else {
                break;
            }
        }
    });
}

pub async fn cancel_execution(execution_id: &str) -> Result<(), String> {
    let mut processes = RUNNING_PROCESSES.lock().await;
    if let Some(mut child) = processes.remove(execution_id) {
        child.kill().await.map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Execution not found".to_string())
    }
}

pub async fn install_tool(
    package: &str,
    is_cask: bool,
    download_url: Option<String>,
    bin_name: &str,
    window: tauri::Window,
) -> Result<String, String> {
    let execution_id = uuid::Uuid::new_v4().to_string();

    // Validate package name: only allow alphanumeric, hyphens, underscores, slashes, @
    if !package.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == '/' || c == '@') {
        return Err(format!("Invalid package name: {}", package));
    }

    if crate::sandbox::is_sandboxed() {
        // Sandboxed mode: download pre-built binary into app container
        install_via_download(&execution_id, download_url, bin_name, window).await
    } else {
        // Dev mode: use Homebrew
        install_via_brew(&execution_id, package, is_cask, window).await
    }
}

async fn install_via_brew(
    execution_id: &str,
    package: &str,
    is_cask: bool,
    window: tauri::Window,
) -> Result<String, String> {
    let brew_path = resolve_binary("brew")
        .map_err(|_| "Homebrew is not installed. Please install it from https://brew.sh".to_string())?;

    let mut args = vec!["install".to_string()];
    if is_cask {
        args.insert(0, "--cask".to_string());
    }
    args.push(package.to_string());

    emit_output(&window, execution_id, "info", &format!("Running: brew {}", args.join(" ")));

    let mut child = Command::new(&brew_path)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to run brew: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let window_clone = window.clone();
    let exec_id = execution_id.to_string();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            emit_output(&window_clone, &exec_id, "stdout", &line);
        }
    });

    let window_clone = window.clone();
    let exec_id = execution_id.to_string();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            emit_output(&window_clone, &exec_id, "stderr", &line);
        }
    });

    let exec_id = execution_id.to_string();
    tokio::spawn(async move {
        match child.wait().await {
            Ok(status) => {
                let exit_code = status.code().unwrap_or(-1);
                if exit_code == 0 {
                    emit_output(&window, &exec_id, "exit", "Installation completed successfully!");
                } else {
                    emit_output(&window, &exec_id, "exit", &format!("Installation failed with exit code: {}", exit_code));
                }
            }
            Err(e) => {
                emit_output(&window, &exec_id, "error", &format!("Installation error: {}", e));
            }
        }
    });

    Ok(execution_id.to_string())
}

async fn install_via_download(
    execution_id: &str,
    download_url: Option<String>,
    bin_name: &str,
    window: tauri::Window,
) -> Result<String, String> {
    let url = download_url.ok_or_else(|| {
        "No download URL available for this tool. Cannot install in sandboxed mode.".to_string()
    })?;

    let bin_dir = crate::sandbox::user_tools_bin_dir()
        .ok_or("Could not determine tools directory")?;

    std::fs::create_dir_all(&bin_dir)
        .map_err(|e| format!("Failed to create bin directory: {}", e))?;

    emit_output(&window, execution_id, "info", &format!("Downloading {} from {}...", bin_name, url));

    let exec_id = execution_id.to_string();
    let bin_name_owned = bin_name.to_string();

    tokio::spawn(async move {
        match download_and_install(&url, &bin_name_owned, &bin_dir).await {
            Ok(path) => {
                emit_output(&window, &exec_id, "stdout", &format!("Installed to: {}", path));
                emit_output(&window, &exec_id, "exit", "Installation completed successfully!");
            }
            Err(e) => {
                emit_output(&window, &exec_id, "error", &format!("Download failed: {}", e));
            }
        }
    });

    Ok(execution_id.to_string())
}

async fn download_and_install(
    url: &str,
    bin_name: &str,
    bin_dir: &Path,
) -> Result<String, String> {
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let dest = bin_dir.join(bin_name);

    // If the URL ends in .tar.gz or .zip, extract it; otherwise save directly
    if url.ends_with(".tar.gz") || url.ends_with(".tgz") {
        let cache_dir = crate::sandbox::downloads_cache_dir()
            .ok_or("Could not determine cache directory")?;
        let archive_path = cache_dir.join(format!("{}.tar.gz", bin_name));
        std::fs::write(&archive_path, &bytes)
            .map_err(|e| format!("Failed to write archive: {}", e))?;

        // Extract using tar (available in sandbox at /usr/bin/tar)
        let output = std::process::Command::new("/usr/bin/tar")
            .args(["-xzf", &archive_path.to_string_lossy(), "-C", &bin_dir.to_string_lossy()])
            .output()
            .map_err(|e| format!("Failed to extract archive: {}", e))?;

        if !output.status.success() {
            return Err(format!("tar extraction failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        // Clean up archive
        let _ = std::fs::remove_file(&archive_path);
    } else if url.ends_with(".zip") {
        let cache_dir = crate::sandbox::downloads_cache_dir()
            .ok_or("Could not determine cache directory")?;
        let archive_path = cache_dir.join(format!("{}.zip", bin_name));
        std::fs::write(&archive_path, &bytes)
            .map_err(|e| format!("Failed to write archive: {}", e))?;

        let output = std::process::Command::new("/usr/bin/unzip")
            .args(["-o", &archive_path.to_string_lossy(), "-d", &bin_dir.to_string_lossy()])
            .output()
            .map_err(|e| format!("Failed to extract archive: {}", e))?;

        if !output.status.success() {
            return Err(format!("unzip failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let _ = std::fs::remove_file(&archive_path);
    } else {
        // Direct binary download
        std::fs::write(&dest, &bytes)
            .map_err(|e| format!("Failed to write binary: {}", e))?;
    }

    // Make executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o755);
        std::fs::set_permissions(&dest, perms)
            .map_err(|e| format!("Failed to set permissions: {}", e))?;
    }

    Ok(dest.to_string_lossy().to_string())
}

pub fn resolve_binary(bin_name: &str) -> Result<String, String> {
    // 1. Absolute path — check directly
    if Path::new(bin_name).is_absolute() {
        if Path::new(bin_name).exists() {
            return Ok(bin_name.to_string());
        } else {
            return Err(format!("Binary not found at absolute path: {}", bin_name));
        }
    }

    // 2. User-installed tools in app container (sandbox-safe)
    if let Some(user_bin) = crate::sandbox::user_tools_bin_dir() {
        let user_path = user_bin.join(bin_name);
        if user_path.exists() {
            return Ok(user_path.to_string_lossy().to_string());
        }
    }

    // 3. Bundled tools inside .app Resources (sandbox-safe)
    if let Some(bundled) = crate::sandbox::bundled_tools_dir() {
        let bundled_path = bundled.join(bin_name);
        if bundled_path.exists() {
            return Ok(bundled_path.to_string_lossy().to_string());
        }
    }

    // 4. System PATH (works in dev / unsandboxed mode)
    if let Ok(path) = which::which(bin_name) {
        return Ok(path.to_string_lossy().to_string());
    }

    // 5. Common Homebrew paths (dev fallback)
    if !crate::sandbox::is_sandboxed() {
        let homebrew_paths = vec![
            format!("/opt/homebrew/bin/{}", bin_name),
            format!("/usr/local/bin/{}", bin_name),
            format!("/opt/homebrew/opt/{}/bin/{}", bin_name, bin_name),
        ];

        for path in homebrew_paths {
            if Path::new(&path).exists() {
                return Ok(path);
            }
        }
    }

    // 6. System utilities always available even in sandbox
    let system_paths = vec![
        format!("/usr/bin/{}", bin_name),
        format!("/bin/{}", bin_name),
    ];
    for path in system_paths {
        if Path::new(&path).exists() {
            return Ok(path);
        }
    }

    Err(format!(
        "Binary '{}' not found. Please install it or provide an absolute path.",
        bin_name
    ))
}

fn validate_params(tool: &Tool, params: &serde_json::Map<String, Value>) -> Result<(), String> {
    for arg in &tool.args {
        if arg.is_required() {
            let key = arg.key();
            let value = params.get(key);

            if value.is_none() || value.unwrap().is_null() {
                return Err(format!("Required parameter '{}' is missing", key));
            }

            match arg {
                Argument::Text { .. } => {
                    if !value.unwrap().is_string() || value.unwrap().as_str().unwrap().is_empty() {
                        return Err(format!("Parameter '{}' must be a non-empty string", key));
                    }
                }
                Argument::File { .. } => {
                    if !value.unwrap().is_string() || value.unwrap().as_str().unwrap().is_empty() {
                        return Err(format!("Parameter '{}' must be a file path", key));
                    }
                }
                _ => {}
            }
        }
    }

    Ok(())
}

fn build_context(
    tool: &Tool,
    params: &serde_json::Map<String, Value>,
) -> Result<HashMap<String, String>, String> {
    let mut context = HashMap::new();

    for arg in &tool.args {
        let key = arg.key();
        let value = params.get(key);

        let string_value = if let Some(v) = value {
            match v {
                Value::String(s) => s.clone(),
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => b.to_string(),
                Value::Null => continue,
                _ => return Err(format!("Invalid value type for parameter '{}'", key)),
            }
        } else if let Some(default) = arg.get_default_value() {
            match default {
                Value::String(s) => s,
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => b.to_string(),
                _ => continue,
            }
        } else {
            continue;
        };

        context.insert(key.to_string(), string_value);
    }

    if let Some(input_path) = context.get("input").cloned() {
        let path = PathBuf::from(&input_path);
        if let Some(stem) = path.file_stem() {
            context.insert("inputStem".to_string(), stem.to_string_lossy().to_string());
        }
        if let Some(name) = path.file_name() {
            context.insert("inputName".to_string(), name.to_string_lossy().to_string());
        }
        if let Some(parent) = path.parent() {
            context.insert("inputDir".to_string(), parent.to_string_lossy().to_string());
        }
        if let Some(ext) = path.extension() {
            context.insert("inputExt".to_string(), ext.to_string_lossy().to_string());
        }
    }

    for output in &tool.outputs {
        if let Some(template) = &output.default_template {
            let expanded = expand_template(template, &context)?;
            context.insert(output.key.clone(), expanded);
        } else if let Some(value) = params.get(&output.key) {
            if let Some(s) = value.as_str() {
                context.insert(output.key.clone(), s.to_string());
            }
        }
    }

    Ok(context)
}

fn expand_command_template(
    template: &[String],
    context: &HashMap<String, String>,
) -> Result<Vec<String>, String> {
    let mut result = Vec::new();

    for part in template {
        let expanded = expand_template(part, context)?;
        result.push(expanded);
    }

    Ok(result)
}

fn expand_template(template: &str, context: &HashMap<String, String>) -> Result<String, String> {
    let mut result = template.to_string();

    for (key, value) in context {
        let placeholder = format!("{{{}}}", key);
        result = result.replace(&placeholder, value);
    }

    if result.contains('{') && result.contains('}') {
        let start = result.find('{').unwrap();
        let end = result.find('}').unwrap();
        if end > start {
            let key = &result[start + 1..end];
            return Err(format!("Unresolved placeholder: {{{}}}", key));
        }
    }

    Ok(result)
}

fn emit_output(window: &tauri::Window, execution_id: &str, output_type: &str, data: &str) {
    let output = ExecutionOutput {
        output_type: output_type.to_string(),
        data: data.to_string(),
    };

    let _ = window.emit(
        &format!("execution-output-{}", execution_id),
        output,
    );
}
