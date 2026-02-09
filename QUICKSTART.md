# CliDeck Quick Start

Get CliDeck running in 5 minutes.

## Prerequisites Check

```bash
# Check if you have the required tools
rustc --version  # Need Rust
node --version   # Need Node.js v18+
```

Don't have them? Install:
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js (via Homebrew)
brew install node
```

## Build & Run

```bash
# 1. Navigate to project
cd /Users/carlgarcia/Documents/GitHub/cliDeck

# 2. Install frontend dependencies
cd ui
npm install

# 3. Go back to root
cd ..

# 4. Run in development mode
cd src-tauri
cargo tauri dev
```

The app will open automatically. If you see errors about missing icons, that's expected - the app will still work.

## Add Your First Tool

```bash
# 1. Create tools directory
mkdir -p ~/Library/Application\ Support/CliDeck/tools

# 2. Copy an example tool
cp examples/curl_download.yaml ~/Library/Application\ Support/CliDeck/tools/

# 3. Reload tools in the app (click menu bar icon → Reload Tools)
```

## Test It Out

1. Click the CliDeck menu bar icon
2. Select "cURL: Download File" from the sidebar
3. Enter a URL (e.g., `https://httpbin.org/json`)
4. Choose where to save the file
5. Click "Run"
6. Watch the output stream in real-time!

## Create Your Own Tool

Create `~/Library/Application Support/CliDeck/tools/my-tool.yaml`:

```yaml
id: my_tool
label: "My First Tool"
description: "Does something cool"
bin: echo
args:
  - key: message
    type: text
    required: true
    label: "Message"
command:
  - "{bin}"
  - "{message}"
outputs: []
```

Reload tools and it appears instantly!

## Common Issues

**"Binary not found"**
- Install the tool: `brew install <tool-name>`
- Or use absolute path in YAML: `bin: /usr/local/bin/tool`

**App won't start**
- Check Rust is installed: `rustc --version`
- Clean build: `cd src-tauri && cargo clean && cargo build`

**Tools not appearing**
- Check YAML syntax
- Look for errors in terminal where you ran `cargo tauri dev`
- Verify file is in `~/Library/Application Support/CliDeck/tools/`

## Next Steps

- Read [README.md](README.md) for full documentation
- Check [BUILDING.md](BUILDING.md) for production builds
- Browse [examples/](examples/) for more tool ideas
- Create custom tools for your workflow!

## Tips

- **Presets**: Save parameter combinations you use often
- **Reload**: Right-click menu bar icon → "Reload Tools" after editing YAML
- **Logs**: Watch the terminal for execution details
- **DevTools**: Right-click in app → Inspect Element for debugging

Happy CLI-wrapping! 🚀
