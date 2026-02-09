# CliDeck Roadmap

## Current State (v0.1.0)

CliDeck is a functional macOS menu-bar app that wraps CLI tools with YAML-driven UI. What's shipping today:

- **YAML-driven tool definitions** with 6 argument types (text, int, float, bool, enum, file)
- **Dynamic form generation** from tool schemas
- **Secure execution** (no shell — argument arrays only) with real-time stdout/stderr streaming
- **Binary resolution** across system PATH, Homebrew, bundled, and user-installed locations
- **One-click binary install** (Homebrew in dev, HTTP download in sandbox)
- **Preset management** (save/load/delete parameter snapshots)
- **Interactive tool creator** with live YAML preview
- **Hierarchical folder organization** (subfolder-based groups with collapsible sidebar)
- **Command palette** (⌘3) with fuzzy search
- **Help/onboarding panel** with reference docs
- **App Store sandbox compatibility** (dual-mode: sandboxed + unsandboxed)
- **System tray integration** (menu bar native, no dock icon)

---

## Phase 1 — Polish & Daily-Driver Quality (v0.2)

_Goal: Make it reliable enough to be someone's default way to run project commands._

| Feature | Description | Effort |
|---------|-------------|--------|
| **Dark mode** | Respect macOS appearance, add dark Tailwind variants | S |
| **Launch on login** | `LSUIElement` + login item registration | S |
| **Command history** | Persist last N executions per tool with timestamps | M |
| **Edit existing tools** | Open a tool's YAML in the wizard for modification | M |
| **Delete tools** | Remove YAML files from the UI with confirmation | S |
| **Drag-and-drop reorder** | Reorder tools within groups | M |
| **Notification on completion** | macOS notification when long-running commands finish | S |
| **Error recovery** | Better error messages, retry buttons, partial output preservation | S |
| **Auto-reload** | Watch tools directory with `notify` crate, reload on file changes | M |

---

## Phase 2 — Power User Features (v0.3)

_Goal: Compete with custom scripts and Makefiles for project workflows._

| Feature | Description | Effort |
|---------|-------------|--------|
| **Chained commands** | Define multi-step pipelines (build → test → deploy) with conditional logic | L |
| **Environment variables** | Per-tool and per-preset env var configuration | M |
| **Working directory** | Configurable `cwd` per tool (critical for project commands) | S |
| **Conditional arguments** | Show/hide args based on other arg values | M |
| **Output parsing** | Regex-based extraction of values from output (e.g., URLs, versions) | M |
| **Tool templates** | Built-in templates for common stacks (Node, Rust, Python, Docker, K8s) | M |
| **Import/export** | Share tool packs as `.clideck` bundles (zip of YAMLs) | M |
| **Global keyboard shortcut** | System-wide hotkey to show CliDeck (not just ⌘3 when focused) | S |
| **Multi-window** | Run multiple tools simultaneously in split view | L |

---

## Phase 3 — Team & Ecosystem (v0.4)

_Goal: Make CliDeck useful for teams, not just individuals._

| Feature | Description | Effort |
|---------|-------------|--------|
| **Project-local tools** | Read `.clideck/` directory in project roots (like `.vscode/`) | M |
| **Git-synced tool packs** | Clone tool definitions from a git repo URL | M |
| **Tool marketplace** | Community-contributed tool definitions (curated registry) | L |
| **Secrets management** | Keychain integration for API keys, tokens, passwords | M |
| **Remote execution** | SSH-based execution on remote hosts | L |
| **Webhooks** | Trigger tools via HTTP endpoint (CI/CD integration) | M |
| **Usage analytics** | Local-only stats: which tools you run most, average duration | S |

---

## Phase 4 — Platform Expansion (v1.0)

_Goal: Cross-platform release and App Store submission._

| Feature | Description | Effort |
|---------|-------------|--------|
| **Windows support** | Tauri already supports Windows; adapt binary resolution and paths | L |
| **Linux support** | Adapt for XDG paths, package manager detection | M |
| **Mac App Store submission** | Signing, provisioning, review process | M |
| **Auto-update** | Tauri's built-in updater with GitHub Releases | M |
| **Plugin system** | Custom argument types and output renderers via WASM or JS plugins | XL |
| **Accessibility** | Full VoiceOver/screen reader support, keyboard-only navigation | M |
| **Localization** | i18n for UI strings | M |

---

## Effort Key

| Label | Meaning |
|-------|---------|
| **S** | Small — a few hours, single file changes |
| **M** | Medium — 1-3 days, touches multiple modules |
| **L** | Large — 1-2 weeks, new subsystems |
| **XL** | Extra Large — multi-week, architectural changes |

---

## What's NOT on the Roadmap (and Why)

- **Built-in terminal emulator** — CliDeck is about structured commands, not general terminal replacement. iTerm2/Warp own that space.
- **AI command generation** — Tempting, but adds complexity and API dependencies. May revisit if there's demand.
- **Mobile app** — CLI tools don't run on phones. A remote-trigger companion app could make sense later.
- **Windows/Linux GUI toolkit swap** — Tauri's webview approach works cross-platform. No need for native toolkit per OS.
