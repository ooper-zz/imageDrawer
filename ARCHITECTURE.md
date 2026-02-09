# CliDeck Architecture

## Overview

CliDeck is a macOS menu-bar application that turns any command-line tool into a visual, form-driven interface. Users describe tools in YAML; the app generates the UI, resolves binaries, executes commands securely, and streams output in real time.

```
┌─────────────────────────────────────────────────────────┐
│                    macOS Menu Bar                        │
│                     (SystemTray)                         │
└────────────────────────┬────────────────────────────────┘
                         │ click / menu
┌────────────────────────▼────────────────────────────────┐
│                   Tauri Window                          │
│  ┌──────────┐  ┌────────────────────────────────────┐   │
│  │ ToolList │  │  ToolForm / ToolCreator / HelpPanel│   │
│  │ (sidebar)│  │  ExecutionLog                      │   │
│  │ grouped  │  │  CommandPalette (⌘3)               │   │
│  └────┬─────┘  └──────────┬─────────────────────────┘   │
│       │    React + Tailwind│                            │
└───────┼────────────────────┼────────────────────────────┘
        │  invoke()          │  invoke()
┌───────▼────────────────────▼────────────────────────────┐
│              Tauri IPC Bridge (type-safe)                │
└───────┬────────────────────┬────────────────────────────┘
        │                    │
┌───────▼──────┐  ┌──────────▼─────────┐  ┌─────────────┐
│  Registry    │  │  Executor          │  │  Presets     │
│  (YAML load) │  │  (spawn + stream)  │  │  (JSON I/O) │
└───────┬──────┘  └──────────┬─────────┘  └─────────────┘
        │                    │
┌───────▼──────┐  ┌──────────▼─────────┐
│  Schema      │  │  Sandbox           │
│  (serde)     │  │  (mode detection)  │
└──────────────┘  └────────────────────┘
```

---

## Tech Stack

| Layer       | Technology                          | Purpose                              |
|-------------|-------------------------------------|--------------------------------------|
| Runtime     | **Tauri v1** (Rust)                 | Native window, system tray, IPC      |
| Frontend    | **React 18** + TypeScript           | Dynamic form generation              |
| Styling     | **Tailwind CSS**                    | Utility-first responsive design      |
| Icons       | **Lucide React**                    | Consistent icon set                  |
| Build       | **Vite**                            | Fast frontend bundling               |
| Serializer  | **serde + serde_yaml**              | YAML ↔ Rust struct mapping           |
| Process     | **tokio** + `Command`               | Async subprocess management          |
| HTTP        | **reqwest** (sandboxed installs)    | Binary download in App Store mode    |

---

## Rust Backend Modules

### `main.rs` — Application Entry & Tauri Commands

The orchestrator. Registers 14 Tauri commands, sets up the system tray (Show / Reload / Quit), manages `AppState` (registry + presets behind `Mutex`), and initializes sandbox directories on startup.

**Tauri Commands:**

| Command              | Purpose                                      |
|----------------------|----------------------------------------------|
| `get_tools`          | Return all loaded tools                      |
| `reload_tools`       | Re-scan YAML directories, return fresh list  |
| `execute_tool`       | Run a tool with given params                 |
| `cancel_execution`   | Kill a running subprocess by execution ID    |
| `validate_binary`    | Resolve a binary name to an absolute path    |
| `check_binary`       | Boolean check: is binary available?          |
| `install_binary`     | Brew install (dev) or HTTP download (sandbox)|
| `get_app_mode`       | Return "sandboxed" or "unsandboxed"          |
| `save_tool`          | Write validated YAML to tools directory      |
| `get_tools_directory`| Return the tools directory path              |
| `list_tool_groups`   | List subfolder names for the group picker    |
| `save_preset`        | Persist parameter snapshot                   |
| `get_presets`        | Load presets for a tool                      |
| `delete_preset`      | Remove a saved preset                        |

### `schema.rs` — Data Model

Defines the `Tool` struct and all argument types via a tagged enum:

```
Tool
├── id, label, bin, description, group
├── install: Option<InstallHint>  (brew, cask, url, notes)
├── args: Vec<Argument>
│   ├── Text   { key, required, default, label, placeholder }
│   ├── Int    { key, required, default, label, min, max }
│   ├── Float  { key, required, default, label, min, max }
│   ├── Bool   { key, default, label }
│   ├── Enum   { key, values, required, default, label }
│   └── File   { key, required, label, filters }
├── command: Vec<String>          (template tokens)
└── outputs: Vec<OutputSpec>      (key, type, defaultTemplate)
```

All types derive `Serialize + Deserialize` for zero-friction YAML ↔ Rust ↔ JSON ↔ TypeScript flow.

### `registry.rs` — Tool Discovery & Loading

- Scans `~/Library/Application Support/CliDeck/tools/` **recursively** (including subdirectories)
- Also scans bundled `Resources/tools/` inside the `.app` bundle
- User tools take priority over bundled tools (by ID)
- Auto-derives `group` from subfolder name when not set in YAML
- Deduplicates by tool ID across all sources

### `executor.rs` — Secure Command Execution

**Binary Resolution Order:**
1. Absolute path (if provided)
2. User-installed binaries (`~/Library/Application Support/CliDeck/bin/`)
3. Bundled binaries (`.app/Contents/Resources/tools/`)
4. System PATH (`which::which`)
5. Homebrew paths — dev mode only (`/opt/homebrew/bin/`, `/usr/local/bin/`)
6. System utilities (`/usr/bin`, `/bin`)

**Execution Flow:**
1. Resolve binary path
2. Build template context from args + input metadata (`inputStem`, `inputDir`, `inputExt`, `inputName`)
3. Expand `{placeholder}` tokens in the command array
4. Spawn subprocess via `tokio::process::Command` (no shell — argument array only)
5. Stream stdout/stderr line-by-line via Tauri events (`execution-output-{id}`)
6. Track process in a global `HashMap<String, Child>` for cancellation support

**Dual-Mode Installer:**
- **Dev (unsandboxed):** Runs `brew install <package>` with streaming output
- **Sandboxed:** Downloads binary from URL via `reqwest`, extracts tar.gz/zip, saves to app container `bin/`

### `presets.rs` — Parameter Persistence

- Stores presets as JSON files in `~/Library/Application Support/CliDeck/presets/{tool_id}/`
- Each preset is a named snapshot of form parameters
- CRUD operations: save, list, delete

### `sandbox.rs` — App Store Compatibility

- Detects sandbox mode by checking if `HOME` contains `/Library/Containers/`
- Manages container directories: `bin/`, `cache/`, `tools/`, `presets/`
- Provides `bundled_tools_dir()` for reading from `.app/Contents/Resources/tools/`
- Entitlements files (`entitlements.plist`, `entitlements.debug.plist`) control sandbox permissions

---

## React Frontend Components

### `App.tsx` — Root Component

State machine with three view modes: **tool** (default), **creator**, **help**. Manages tool list, execution state, output stream, and keyboard shortcut (⌘3 for command palette).

### `ToolList.tsx` — Sidebar

- Search/filter across label, bin, id, description, group
- Groups tools by `group` field into collapsible folder sections
- Ungrouped tools appear at the top
- **+ New** button → switches to ToolCreator
- **?** button → switches to HelpPanel

### `ToolForm.tsx` — Dynamic Form

- Auto-generates form fields from `tool.args` (text inputs, number inputs, checkboxes, dropdowns, file pickers)
- Checks binary availability on tool selection (green ✓ / amber ⚠)
- One-click install banner when binary is missing (with streaming install logs)
- Preset load/save/delete
- Output path fields with save-file dialogs

### `ToolCreator.tsx` — Interactive Tool Wizard

- Two-column layout: form fields on left, live YAML preview on right
- Supports all argument types with dynamic add/remove
- Folder picker (existing groups) or create-new-folder
- Validates and saves via `save_tool` command, then auto-reloads

### `HelpPanel.tsx` — Onboarding & Reference

- What is CliDeck
- Creating tools (wizard vs manual YAML)
- YAML format reference with annotated example
- Folder organization guide with directory tree diagram
- Project lifecycle examples (build/start/deploy)
- Template variable reference table
- Keyboard shortcuts

### `CommandPalette.tsx` — Quick Switcher (⌘3)

- Modal overlay with fuzzy search
- Weighted scoring (exact match > starts-with > contains, across label/bin/id/description)
- Keyboard navigation (↑↓ Enter Esc)

### `ExecutionLog.tsx` — Output Stream

- Color-coded output: stdout (white), stderr (yellow), errors (red), info (blue), exit (green)
- Auto-scrolling terminal-style display

---

## Data Flow

### Tool Loading
```
App startup
  → sandbox::ensure_directories()
  → ToolRegistry::new()
    → scan ~/…/CliDeck/tools/**/*.yaml  (recursive)
    → scan .app/Contents/Resources/tools/*.yaml
    → serde_yaml::from_str() → Vec<Tool>
    → auto-derive group from subfolder
  → Frontend calls get_tools → JSON → React state
```

### Command Execution
```
User fills form → clicks Run
  → invoke("execute_tool", { toolId, params })
  → Rust: resolve binary, build context, expand templates
  → tokio::spawn(Command::new(bin).args(expanded))
  → stdout/stderr → line-by-line → window.emit("execution-output-{id}")
  → Frontend: listen() → append to outputs state → render in ExecutionLog
```

### Tool Creation
```
User clicks + New → fills wizard form
  → Live YAML preview updates on every keystroke
  → clicks Save Tool
  → invoke("save_tool", { yamlContent, filename, subfolder })
  → Rust: validate YAML, create subfolder, write file
  → invoke("reload_tools") → refresh sidebar
```

---

## Security Model

| Concern              | Mitigation                                                    |
|----------------------|---------------------------------------------------------------|
| Shell injection      | No shell execution — `Command::new().args()` only             |
| Path traversal       | Subfolder names sanitized (strip `..` and `/`)                |
| YAML injection       | Validated against `Tool` struct before saving                 |
| File access          | System file dialogs only (no raw path input for sensitive ops)|
| Binary trust         | Resolution order prefers known locations over arbitrary PATH  |
| Sandbox isolation    | App Store entitlements restrict filesystem and network access  |

---

## File Layout

```
cliDeck/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs          # Entry, Tauri commands, system tray
│   │   ├── schema.rs         # Tool, Argument, OutputSpec structs
│   │   ├── registry.rs       # Recursive YAML loader, group derivation
│   │   ├── executor.rs       # Binary resolution, execution, install
│   │   ├── presets.rs         # Preset CRUD (JSON files)
│   │   └── sandbox.rs        # Sandbox detection, directory management
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── entitlements.plist     # App Store sandbox entitlements
│   └── entitlements.debug.plist
├── ui/
│   ├── src/
│   │   ├── App.tsx            # Root component, view mode state machine
│   │   ├── types.ts           # TypeScript interfaces mirroring schema.rs
│   │   └── components/
│   │       ├── ToolList.tsx       # Sidebar with search + grouped folders
│   │       ├── ToolForm.tsx       # Dynamic form + binary check + presets
│   │       ├── ToolCreator.tsx    # Interactive YAML wizard
│   │       ├── HelpPanel.tsx      # Onboarding + reference docs
│   │       ├── CommandPalette.tsx  # Quick switcher (⌘3)
│   │       └── ExecutionLog.tsx   # Streaming output display
│   ├── package.json
│   └── tailwind.config.js
├── examples/                  # Example YAML tool definitions
├── scripts/                   # Icon generation
├── README.md
├── QUICKSTART.md
├── BUILDING.md
├── ARCHITECTURE.md            # ← this file
├── ROADMAP.md
└── PITCH.md
```

---

## Runtime Data Locations

| Data            | Path                                                    |
|-----------------|---------------------------------------------------------|
| Tool YAMLs      | `~/Library/Application Support/CliDeck/tools/`          |
| Presets          | `~/Library/Application Support/CliDeck/presets/`        |
| Installed bins   | `~/Library/Application Support/CliDeck/bin/`            |
| Download cache   | `~/Library/Application Support/CliDeck/cache/`          |
| Bundled tools    | `CliDeck.app/Contents/Resources/tools/`                 |
| Built app        | `src-tauri/target/release/bundle/macos/CliDeck.app`     |
| DMG              | `src-tauri/target/release/bundle/dmg/CliDeck_*.dmg`     |
