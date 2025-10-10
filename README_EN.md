<div align="center">

<img src="build/icon.png" alt="CC Bridge Logo" width="120" height="120">

# 🌉 CC Bridge

**Manage Claude Code & Codex transfer stations from one desktop app**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/v/release/aydomini/CC-Bridge)](https://github.com/aydomini/CC-Bridge/releases)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)]()

---

### [English](README_EN.md) | [中文](README.md)

</div>

---

## ✨ Overview

CC Bridge is a **free & open-source** Electron + React desktop application for engineers who need to switch between multiple AI transfer stations. It now supports both **Claude Code** and **OpenAI Codex** style stations with shared workflows:

- 🔄 One-click station switching with automatic backups
- 🔐 AES-256-CBC device-bound token encryption
- ⚙️ Global defaults + per-station overrides + visual preview
- 💰 Optional balance tracking with multi-currency support
- 🌍 Built-in English / Chinese UI and dark mode styling
- 🖥️ Tray menu for instant switching across both modes

> **Latest release:** see [GitHub Releases](https://github.com/aydomini/CC-Bridge/releases)
> **Current build:** macOS (Apple Silicon). Windows, Linux, Intel macOS are planned—PRs welcome!

## 📸 Screenshots

<div align="center">

### Main Interface (Light Mode)
<img src="screenshots/main-interface-light.png" alt="Main Interface Light" width="700">

### Main Interface (Dark Mode)
<img src="screenshots/main-interface-dark.png" alt="Main Interface Dark" width="700">

### Add Station Dialog
<img src="screenshots/add-station-dialog.png" alt="Add Station" width="700">

### Quick Import (JSON)
<img src="screenshots/quick-import-dialog.png" alt="Quick Import" width="700">

</div>

## 📦 Installation

1. Download the newest DMG from [Releases](https://github.com/aydomini/CC-Bridge/releases).  
2. Mount the DMG and drag **CC Bridge** into Applications.  
3. First launch requires macOS Gatekeeper approval:
   - Right-click → *Open* → *Open*, or  
   - System Settings ▸ Privacy & Security ▸ *Open Anyway*, or  
   - `xattr -cr "/Applications/CC Bridge.app"`

The app is currently adhoc-signed (no paid developer certificate). All source code is public for auditing.

## 🚀 Quick Start

### 1. Add Stations

| Field | Claude Mode | Codex Mode |
|-------|-------------|------------|
| Name | Friendly identifier (e.g. *Production*) | Friendly identifier |
| Provider Key | n/a | Optional unique key, defaults to domain |
| URL | `https://` endpoint of transfer station | Same |
| Token | `ANTHROPIC_AUTH_TOKEN` | `OPENAI_API_KEY` |
| Custom Config | JSON overrides merged with global defaults | Same |

- Use **Quick Import** (JSON paste) for Claude: non-standard quotes, commas, and line breaks are auto-normalised.  
- Codex-station import currently expects TOML via manual fields.

### 2. Apply Configurations

- Select a station and press **Apply**.  
- Settings are written to `~/.claude/settings.json` (Claude) or `~/.codex/config.toml` + `auth.json` (Codex).  
- Previous files are timestamped backups. If Claude Code is running, you’ll be reminded to restart.

### 3. Tray Menu

- Menu bar icon lists Claude and Codex stations separately.  
- Applying from the tray also updates the active mode in the app UI.  
- External/unmanaged configs are highlighted with ⚠️.

## ⚙️ Features in Detail

- **Dual-mode global configuration**  
  Separate defaults for Claude/Codex accessible via *Global Config*. Clearing the editor resets to safe defaults.
- **Token security**  
  Device-bound AES-256-CBC encryption with automatic key migration when hardware paths change.
- **Smart previews**  
  Real-time JSON / TOML preview with line-clamp to keep layouts stable during language switching.
- **Layout tuned for productivity**  
  Minimal header controls (theme, language, global config, add station) and auto-aligned version/badge display.

## 🛠️ Development

Prerequisites: **Node.js 16+**, **npm**, **git**

```bash
git clone https://github.com/aydomini/CC-Bridge.git
cd CC-Bridge
npm install

# Development with hot reload
npm run dev

# Type-check & build renderer
npm run build

# Electron package build
npm run package
```

Project structure:

```
CC-Bridge/
├── electron/              # Main process (app lifecycle, IPC, tray)
│   ├── main.ts            # Window management & tray menu
│   ├── preload.ts         # Safe bridge exposing electronAPI
│   └── services/          # Config store, encryption, file writers
├── src/                   # Renderer (React + TypeScript)
│   ├── App.tsx            # Root UI logic
│   ├── components/        # Dialogs, list, icons
│   ├── contexts/          # Theme & language providers
│   └── types/             # Shared TS definitions
└── build/                 # Assets (icons, entitlements)
```

## 🤝 Contributing

1. Fork & branch from `main`.
2. Keep changes mode-aware (Claude & Codex) and update both READMEs.
3. Run `npm run build` before opening a PR.
4. Describe tests performed and screenshots for UI tweaks.

Issues & feature requests: [GitHub Issues](https://github.com/aydomini/CC-Bridge/issues)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=aydomini/CC-Bridge&type=Date)](https://star-history.com/#aydomini/CC-Bridge&Date)

---

Made with ❤️ for the Claude & Codex community. Star ⭐ the repo if CC Bridge saves you time!
