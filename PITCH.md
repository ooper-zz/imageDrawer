# CliDeck — Pitches, Marketing & Competitive Analysis

---

## The One-Liner

**CliDeck turns any command-line tool into a visual, form-driven Mac app — defined in YAML, executed securely, no code required.**

---

## The Problem

Developers and technical users run CLI commands hundreds of times a week. The friction:

1. **Flag amnesia** — Was it `--format` or `--output-format`? `-q` or `--quality`?
2. **Dangerous typos** — One wrong flag on `ffmpeg`, `rm`, or `docker` can be destructive
3. **Onboarding tax** — New team members spend hours learning project-specific commands
4. **Context switching** — Jumping between terminal, docs, and Slack to piece together the right invocation
5. **Repetitive scripting** — Writing the same Makefile/Justfile/shell script for every project

CliDeck eliminates all of this. Write a 10-line YAML file, get a native Mac app with validated inputs, safe execution, and saved presets.

---

## Audience-Specific Pitches

### For Individual Developers

> **"Your CLI tools, but with guardrails."**
>
> Stop memorizing flags. CliDeck gives every CLI tool a clean form UI — dropdowns for options, file pickers for paths, sliders for numbers. Define it once in YAML, use it forever. Save parameter combos as presets. See output in real time. All from your menu bar.
>
> **Use it for:** FFmpeg conversions, ImageMagick transforms, Docker commands, git workflows, build scripts, deployment pipelines.

### For Tech Leads / Engineering Managers

> **"Standardize your team's CLI workflows without writing a custom tool."**
>
> Every team has tribal knowledge locked in READMEs and Slack threads: "To deploy staging, run this command with these 4 flags..." CliDeck turns those into shareable YAML files that generate validated UIs. Drop them in a shared repo. New hires get a visual command center on day one.
>
> **Value prop:** Reduce onboarding time. Eliminate "I ran the wrong command" incidents. No custom tooling budget required.

### For DevOps / Platform Engineers

> **"A lightweight internal developer platform that takes 5 minutes to set up."**
>
> You don't need Backstage, Retool, or a custom admin panel for common operations. CliDeck wraps your existing scripts and CLIs with a native UI. Organize tools into project folders. Add install hints so the binary setup is one click. Ship a `.clideck/` directory in your repo and every developer gets the same command palette.
>
> **Value prop:** Zero infrastructure. No server. No auth. Just YAML files and the tools you already have.

### For Open Source Maintainers

> **"Make your CLI tool accessible to people who don't live in the terminal."**
>
> Ship a `.yaml` file alongside your CLI tool. Users install CliDeck, drop in your YAML, and get a visual interface to your tool — with argument validation, file pickers, and one-click execution. Lower the barrier to adoption without building a GUI yourself.

### For Mac App Store Customers

> **"One app to run all your command-line tools — no terminal required."**
>
> CliDeck is a visual command center for power users. Convert videos with FFmpeg, resize images with ImageMagick, manage Docker containers, run build scripts — all through clean forms instead of cryptic terminal commands. Add your own tools with simple YAML files. Lives in your menu bar, always one click away.

---

## Marketing Copy

### Tagline Options

1. **"Your CLI, but clickable."**
2. **"YAML in, GUI out."**
3. **"The menu bar command center for developers."**
4. **"Never google a CLI flag again."**
5. **"Wrap any CLI tool in a native Mac app — in 10 lines of YAML."**

### App Store Description (Short)

> CliDeck wraps command-line tools in a visual interface. Define tools with simple YAML files — the app generates forms with dropdowns, file pickers, and validated inputs. Execute commands securely with real-time output streaming. Organize tools into project folders. Save parameter presets. All from your menu bar.
>
> Perfect for developers, DevOps engineers, and anyone who runs CLI commands regularly but doesn't want to memorize flags.

### App Store Description (Long)

> **What it does:**
> CliDeck turns any command-line tool into a visual, form-driven interface. You describe the tool in a simple YAML file — its binary, arguments, and command template — and CliDeck generates a native form with the right input types: text fields, dropdowns, file pickers, checkboxes, number inputs with min/max validation.
>
> **How it works:**
> - Write a YAML file (or use the built-in wizard)
> - CliDeck generates the UI automatically
> - Fill in the form, click Run
> - Watch stdout/stderr stream in real time
> - Save parameter combos as reusable presets
>
> **Key features:**
> - Menu bar native — always one click away
> - 6 argument types with validation
> - Hierarchical folder organization
> - Command palette with fuzzy search (⌘3)
> - One-click binary installation
> - Secure execution (no shell injection)
> - Preset management
> - Interactive tool creator with live YAML preview
>
> **Built for:**
> FFmpeg, ImageMagick, Docker, git, npm, cargo, python, kubectl, terraform, ansible — any CLI tool with flags and arguments.

### README Hero Section

```
┌──────────────────────────────────────────────────┐
│  CliDeck                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                  │
│  Your CLI tools, but with a UI.                  │
│                                                  │
│  10 lines of YAML → native Mac form              │
│  Real-time output streaming                      │
│  Presets, folders, command palette                │
│  Menu bar native. Lightweight. Secure.           │
│                                                  │
│  [Download DMG]  [View on GitHub]  [App Store]   │
└──────────────────────────────────────────────────┘
```

---

## Honest Competitive Analysis

### Direct Competitors

| Product | What It Is | Price | How CliDeck Compares |
|---------|-----------|-------|---------------------|
| **Shortcuts.app** (Apple) | Visual automation for macOS | Free | Shortcuts is general-purpose automation (files, apps, web). CliDeck is laser-focused on CLI tools with proper argument types, streaming output, and YAML portability. Shortcuts can't do real-time stdout streaming or generate forms from schemas. **CliDeck wins on CLI depth; Shortcuts wins on breadth.** |
| **Raycast** | Launcher + extensions | Free / $8/mo | Raycast is a productivity launcher that can run scripts via extensions. But building a Raycast extension requires TypeScript/React code. CliDeck needs only YAML. Raycast's script commands are closer, but they don't generate forms from schemas. **Raycast wins on ecosystem size; CliDeck wins on zero-code tool definition.** |
| **Alfred** + Workflows | Launcher + automation | £34+ | Similar to Raycast. Alfred workflows are powerful but require coding or buying pre-made workflows. CliDeck's YAML approach is simpler for CLI wrapping specifically. **Alfred wins on maturity and ecosystem; CliDeck wins on CLI-specific UX.** |
| **Retool / Airplane / Superblocks** | Internal tool builders | $10-50/user/mo | These are web-based platforms for building admin panels and internal tools. They're overkill for "I want a form that runs `npm run build`." They require servers, auth, and significant setup. **They win for team-wide web dashboards; CliDeck wins for local, lightweight, zero-infra CLI wrapping.** |
| **Makefiles / Justfiles / Task** | Task runners | Free | These are the closest functional equivalent. They define commands in a file and run them from the terminal. But they have no UI, no argument validation, no file pickers, no presets, no streaming output panel. **They win on ubiquity and simplicity; CliDeck wins on discoverability and safety.** |
| **Warp** | Modern terminal | Free / $18/mo | Warp is a terminal replacement with AI, blocks, and workflows. Warp Workflows can define parameterized commands. But Warp is a full terminal — CliDeck is a focused tool runner. **Warp wins as a terminal; CliDeck wins as a non-terminal interface to CLI tools.** |

### Indirect Competitors

| Product | Overlap | Differentiation |
|---------|---------|-----------------|
| **Hammerspoon** | macOS automation | Lua scripting, not CLI-focused |
| **BetterTouchTool** | Custom shortcuts | Touch Bar / trackpad focused |
| **Automator** (Apple, deprecated) | Visual scripting | Being replaced by Shortcuts, limited CLI support |
| **n8n / Zapier** | Workflow automation | Cloud-based, not local CLI |

---

## Is CliDeck Competitive? An Honest Assessment

### Where CliDeck Has a Real Edge

1. **Zero-code tool definition.** No other tool lets you go from "I have a CLI command" to "I have a native Mac form" with just YAML. Raycast and Alfred require code. Retool requires a server. Makefiles have no UI.

2. **The YAML schema is genuinely good.** Six argument types with validation, file pickers, output templates, install hints — it's a well-thought-out DSL for describing CLI tools. This is the core IP.

3. **Menu bar native.** It's always there, never in the way. No browser tab, no Electron bloat (Tauri is ~5MB vs Electron's ~150MB).

4. **Security model.** Argument-array execution (no shell injection) is a real safety advantage over Makefiles and shell scripts.

5. **Hierarchical organization.** The folder-based grouping with interactive creation is genuinely useful for managing dozens of project commands.

### Where CliDeck Is Weak (Be Honest)

1. **No working directory support yet.** This is a critical gap. Most project commands need to run in a specific directory. Without `cwd` in the YAML schema, users can't effectively use CliDeck for project-specific commands unless they hardcode absolute paths. **This should be the #1 priority fix.**

2. **macOS only.** The market for Mac-only developer tools is real (see: Raycast, Tower, Paw/RapidAPI) but limited. Cross-platform would dramatically expand the addressable market.

3. **No chained commands.** Real workflows are multi-step: build → test → deploy. CliDeck can only run one command at a time. Makefiles and Justfiles handle this natively.

4. **No environment variables.** Many CLI tools need `NODE_ENV=production` or `AWS_PROFILE=staging`. There's no way to set env vars per tool yet.

5. **Discovery problem.** Users need to know CliDeck exists AND know YAML AND have CLI tools they want to wrap. The intersection of those three is small. A tool marketplace or built-in templates would help.

6. **No edit/delete for existing tools.** You can create tools but can't edit or delete them from the UI. Users have to find the YAML file manually.

### Market Positioning — Where CliDeck Fits

```
                    More UI ──────────────────────►
                    │
         Low Setup  │  Makefiles    CliDeck ←── sweet spot
                    │  Justfiles
                    │  npm scripts
                    │
                    │
                    │  Shell        Raycast
                    │  aliases      Alfred
                    │               Warp Workflows
                    │
        High Setup  │  Custom       Retool
                    │  scripts      Airplane
                    │               Backstage
                    │
                    ▼
```

CliDeck's sweet spot is **low setup + real UI**. It's for people who want more than a Makefile but less than a custom internal tool.

### Realistic Market Size

- **Primary audience:** Mac developers who run CLI tools daily and want visual shortcuts → ~500K-2M users globally
- **Willingness to pay:** Low for individuals ($0-5/mo), moderate for teams ($5-15/user/mo for a team version)
- **App Store potential:** Niche but viable. Developer tools like Proxyman, RapidAPI, and Paw have proven the category. A one-time $9.99-$19.99 price point is realistic.
- **Open source potential:** Strong. The YAML schema format could become a standard if adopted by CLI tool authors.

### Verdict

**CliDeck is not yet competitive with Raycast or Alfred as a general productivity tool.** It shouldn't try to be.

**CliDeck IS competitive — and potentially best-in-class — in a specific niche:** turning CLI tools into visual forms with zero code. No other tool does this as cleanly. The YAML-to-UI pipeline is the moat.

**To be truly competitive, it needs (in priority order):**
1. Working directory (`cwd`) support — without this, project commands are crippled
2. Environment variable support — table stakes for real-world CLI usage
3. Chained commands — to replace Makefiles, not just supplement them
4. Built-in templates — lower the "blank page" barrier
5. Cross-platform — to escape the Mac-only ceiling

**Bottom line:** CliDeck is a solid v0.1 with a clear, defensible niche. It's not ready to charge money yet, but it's 2-3 features away from being a genuinely useful daily-driver tool that could sustain a small open-source project or a niche App Store listing.

---

## Suggested Launch Strategy

### Phase 1: Open Source Launch
- **Where:** Hacker News "Show HN", r/macapps, r/commandline, Dev.to
- **Hook:** "I built a Mac app that turns any CLI tool into a visual form — with just YAML"
- **Goal:** 100 GitHub stars, 50 actual users, feedback on what's missing

### Phase 2: Content Marketing
- **Blog posts:** "How I replaced my Makefile with YAML" / "Visual FFmpeg without a web app"
- **YouTube:** 2-minute demo video showing YAML → form → execution
- **Twitter/X:** GIF demos of specific tools (FFmpeg, Docker, kubectl)

### Phase 3: App Store
- **Price:** Free with optional tip jar, or $9.99 one-time
- **Category:** Developer Tools
- **Screenshots:** Show the tool creator, folder organization, execution output

### Phase 4: Community
- **Tool marketplace:** GitHub repo of community-contributed YAMLs
- **Integration guides:** "CliDeck + Docker", "CliDeck + Kubernetes", "CliDeck + FFmpeg"
- **Template packs:** Pre-made YAML bundles for common stacks
