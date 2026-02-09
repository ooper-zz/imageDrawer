# Building CliDeck

Complete instructions for building and running CliDeck on macOS.

## Prerequisites

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

Verify installation:
```bash
rustc --version
cargo --version
```

### 2. Install Node.js

Using Homebrew:
```bash
brew install node
```

Or download from [nodejs.org](https://nodejs.org)

Verify installation:
```bash
node --version  # Should be v18+
npm --version
```

### 3. Install Xcode Command Line Tools

```bash
xcode-select --install
```

### 4. Install Tauri CLI (Optional)

```bash
cargo install tauri-cli
```

## Building for Development

### Step 1: Clone and Navigate

```bash
cd /Users/carlgarcia/Documents/GitHub/cliDeck
```

### Step 2: Install Frontend Dependencies

```bash
cd ui
npm install
cd ..
```

This will install:
- React and React DOM
- Tauri API bindings
- Vite (build tool)
- Tailwind CSS
- TypeScript
- Lucide React (icons)

### Step 3: Run in Development Mode

**Option A: Using Tauri CLI**

```bash
cd src-tauri
cargo tauri dev
```

**Option B: Manual (two terminals)**

Terminal 1 - Frontend dev server:
```bash
cd ui
npm run dev
```

Terminal 2 - Tauri app:
```bash
cd src-tauri
cargo run
```

The app will open with hot-reload enabled. Changes to frontend code will auto-refresh.

## Building for Production

### Create Release Build

```bash
cd src-tauri
cargo tauri build
```

This will:
1. Build the frontend with optimizations
2. Compile Rust code in release mode
3. Create a macOS app bundle
4. Generate a DMG installer

### Build Artifacts

The built app will be located at:
```
src-tauri/target/release/bundle/macos/CliDeck.app
```

DMG installer:
```
src-tauri/target/release/bundle/dmg/CliDeck_0.1.0_aarch64.dmg
```

### Install the App

```bash
# Copy to Applications
cp -r src-tauri/target/release/bundle/macos/CliDeck.app /Applications/

# Or open the DMG and drag to Applications
open src-tauri/target/release/bundle/dmg/*.dmg
```

## First Run Setup

### 1. Create Tools Directory

```bash
mkdir -p ~/Library/Application\ Support/CliDeck/tools
```

### 2. Copy Example Tools

```bash
cp examples/*.yaml ~/Library/Application\ Support/CliDeck/tools/
```

### 3. Install Required Binaries

For the example tools to work, install:

```bash
# FFmpeg
brew install ffmpeg

# ImageMagick
brew install imagemagick

# cURL (usually pre-installed)
which curl

# Git (usually pre-installed)
which git
```

### 4. Launch CliDeck

- Click the CliDeck icon in your menu bar
- Select a tool from the left sidebar
- Fill in parameters
- Click "Run"

## Troubleshooting Build Issues

### Rust Compilation Errors

```bash
# Update Rust
rustup update

# Clean build cache
cd src-tauri
cargo clean
cargo build
```

### Frontend Build Errors

```bash
# Clear node_modules and reinstall
cd ui
rm -rf node_modules package-lock.json
npm install
```

### Tauri Build Errors

```bash
# Update Tauri CLI
cargo install tauri-cli --force

# Check Tauri dependencies
cd src-tauri
cargo tauri info
```

### Missing Dependencies

If you see errors about missing system libraries:

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## Development Tips

### Fast Iteration

For frontend-only changes:
```bash
cd ui
npm run dev
# Open http://localhost:5173 in browser
```

For Rust-only changes:
```bash
cd src-tauri
cargo check  # Fast syntax check
cargo build  # Full build
```

### Debugging

**Rust Backend:**
- Add `println!()` or `eprintln!()` statements
- Use `RUST_LOG=debug cargo tauri dev` for detailed logs

**Frontend:**
- Open DevTools in the app: Right-click → Inspect Element
- Use `console.log()` statements
- Check Network tab for Tauri command calls

### Code Formatting

```bash
# Format Rust code
cd src-tauri
cargo fmt

# Format TypeScript/React
cd ui
npm run format  # If configured
```

## Build Optimization

### Reduce Binary Size

Edit `src-tauri/Cargo.toml`:

```toml
[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

### Faster Builds

```bash
# Use mold linker (faster)
brew install mold

# Add to ~/.cargo/config.toml
[target.aarch64-apple-darwin]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=/opt/homebrew/bin/mold"]
```

## CI/CD

### GitHub Actions Example

```yaml
name: Build
on: [push]
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Install dependencies
        run: cd ui && npm install
      - name: Build
        run: cd src-tauri && cargo tauri build
      - uses: actions/upload-artifact@v3
        with:
          name: CliDeck
          path: src-tauri/target/release/bundle/dmg/*.dmg
```

## Next Steps

After successful build:

1. **Test thoroughly**: Try all example tools
2. **Create custom tools**: Write your own YAML definitions
3. **Report issues**: Open GitHub issues for bugs
4. **Contribute**: Submit PRs for improvements

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: README.md

## Version Information

Check versions:
```bash
# Rust
rustc --version

# Cargo
cargo --version

# Node
node --version

# Tauri
cargo tauri --version

# App version
grep version src-tauri/Cargo.toml
```
