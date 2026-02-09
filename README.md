# CliDeck

A production-quality macOS menu bar application that wraps CLI tools with dynamic YAML-driven UI. Never remember flags or parameters again.

## Features

- **Menu Bar Native**: Lives in your macOS menu bar, no dock icon clutter
- **YAML-Driven**: Define tools with simple YAML schemas
- **Dynamic UI**: Forms auto-generate from tool definitions
- **Secure Execution**: No shell injection - uses argument arrays only
- **Preset Management**: Save and reuse parameter combinations
- **Real-time Output**: Stream stdout/stderr with color coding
- **Binary Resolution**: Automatic detection of Homebrew and system binaries
- **Lightweight**: Built with Tauri (Rust + Web)

## Architecture

```
CliDeck/
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── main.rs     # App entry & Tauri commands
│   │   ├── schema.rs   # YAML schema definitions
│   │   ├── registry.rs # Tool registry & loader
│   │   ├── executor.rs # Secure command execution
│   │   └── presets.rs  # Preset management
│   └── Cargo.toml
├── ui/                 # React frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── types.ts
│   └── package.json
└── examples/           # Example tool definitions
```

## Installation

### Prerequisites

- **Rust**: Install from [rustup.rs](https://rustup.rs)
- **Node.js**: v18+ (for frontend build)
- **Xcode Command Line Tools**: `xcode-select --install`

### Build from Source

```bash
# Clone the repository
git clone <repo-url>
cd cliDeck

# Install frontend dependencies
cd ui
npm install
cd ..

# Build the app
cd src-tauri
cargo tauri build

# The built app will be in src-tauri/target/release/bundle/macos/
```

### Development Mode

```bash
# Terminal 1: Start frontend dev server
cd ui
npm run dev

# Terminal 2: Run Tauri in dev mode
cd src-tauri
cargo tauri dev
```

## Usage

### Adding Tools

Tools are defined in YAML files located at:
```
~/Library/Application Support/CliDeck/tools/
```

Copy example tools to get started:
```bash
mkdir -p ~/Library/Application\ Support/CliDeck/tools
cp examples/*.yaml ~/Library/Application\ Support/CliDeck/tools/
```

### Tool Schema

```yaml
id: tool_unique_id
label: "Display Name"
description: "Optional description"
bin: binary_name_or_path

args:
  - key: param_name
    type: text|int|float|bool|enum|file
    required: true|false
    default: value
    label: "Display Label"
    # Type-specific options...

command:
  - "{bin}"
  - "--flag"
  - "{param_name}"

outputs:
  - key: output
    type: save_file
    defaultTemplate: "{inputStem}.ext"
```

### Parameter Types

#### Text
```yaml
- key: name
  type: text
  required: true
  placeholder: "Enter text..."
```

#### Integer/Float
```yaml
- key: count
  type: int
  min: 1
  max: 100
  default: 10
```

#### Boolean
```yaml
- key: verbose
  type: bool
  default: false
```

#### Enum
```yaml
- key: format
  type: enum
  values: [jpg, png, gif]
  default: jpg
```

#### File
```yaml
- key: input
  type: file
  required: true
```

### Template Variables

Use placeholders in `command` and `defaultTemplate`:

- `{bin}` - Resolved binary path
- `{param_name}` - Any parameter key
- `{input}` - Input file path
- `{inputStem}` - Input filename without extension
- `{inputName}` - Input filename with extension
- `{output}` - Output file path

### Presets

1. Configure parameters in the form
2. Click the **Save** button
3. Name your preset
4. Load presets from the dropdown

Presets are stored at:
```
~/Library/Application Support/CliDeck/presets/
```

## Security

- **No Shell Execution**: Commands use `Command::new().args()` - no shell interpretation
- **Explicit File Access**: File paths only via system dialogs
- **No Network Access**: App runs entirely locally
- **Sandboxed**: Only defined tools can execute

## Binary Resolution

CliDeck searches for binaries in this order:

1. Absolute paths (if provided)
2. System PATH
3. Homebrew paths:
   - `/opt/homebrew/bin/`
   - `/usr/local/bin/`
   - `/opt/homebrew/opt/{bin}/bin/`

## Example Tools

### FFmpeg Audio Extraction
```bash
cp examples/ffmpeg_audio.yaml ~/Library/Application\ Support/CliDeck/tools/
```

### ImageMagick Resize
```bash
cp examples/imagemagick_resize.yaml ~/Library/Application\ Support/CliDeck/tools/
```

### cURL Download
```bash
cp examples/curl_download.yaml ~/Library/Application\ Support/CliDeck/tools/
```

### Git Clone
```bash
cp examples/git_clone.yaml ~/Library/Application\ Support/CliDeck/tools/
```

## Troubleshooting

### Binary Not Found

If a tool shows "Binary not found":

1. Install the binary: `brew install <tool>`
2. Or provide absolute path in YAML: `bin: /usr/local/bin/tool`
3. Or use "Locate Binary" in UI (future feature)

### Tool Not Appearing

1. Check YAML syntax: `yamllint tool.yaml`
2. Reload tools: Right-click menu bar icon → "Reload Tools"
3. Check logs in Console.app for parse errors

### Execution Fails

- Verify all required parameters are filled
- Check binary has execute permissions
- Review command template for placeholder errors

## Development

### Project Structure

- **Rust Backend**: Handles YAML parsing, command execution, file I/O
- **React Frontend**: Dynamic form generation, real-time log display
- **Tauri Bridge**: Type-safe IPC between Rust and TypeScript

### Adding Features

1. Backend: Add Tauri command in `src-tauri/src/main.rs`
2. Frontend: Call via `invoke()` from `@tauri-apps/api`
3. Types: Update `ui/src/types.ts` for TypeScript safety

### Testing

```bash
# Run Rust tests
cd src-tauri
cargo test

# Run frontend tests (if added)
cd ui
npm test
```

## Roadmap

- [ ] Launch on login option
- [ ] Custom binary path override UI
- [ ] Tool categories/folders
- [ ] Command history
- [ ] Export/import tool definitions
- [ ] Dark mode support
- [ ] Keyboard shortcuts
- [ ] Tool search/filter

## License

MIT

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## Credits

Built with:
- [Tauri](https://tauri.app) - Desktop app framework
- [React](https://react.dev) - UI framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Lucide](https://lucide.dev) - Icons
