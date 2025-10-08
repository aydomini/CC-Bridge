<div align="center">

<img src="build/icon.png" alt="CC Bridge Logo" width="120" height="120">

# 🌉 CC Bridge

**Seamlessly manage multiple Claude Code transfer stations**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/v/release/aydomini/CC-Bridge)](https://github.com/aydomini/CC-Bridge/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)]()

---

### [English](README_EN.md) | [中文](README.md)

</div>

---

## ✨ What is CC Bridge?

CC Bridge is a **free and open-source** desktop application that allows you to manage multiple Claude Code transfer station configurations effortlessly. Switch between different API endpoints, manage authentication tokens securely, and customize settings per station - all with a beautiful, intuitive interface.

Perfect for developers who:

- 🔄 Use multiple Claude Code transfer stations
- 🔐 Need secure token management
- ⚙️ Want per-station custom configurations
- 💰 Track API usage and balances
- 🌍 Work in multiple languages

## 📸 Screenshots

<div align="center">

**Main Interface - Light Mode**

<img src="screenshots/main-interface-light.png" alt="Main Interface Light" width="600">

**Main Interface - Dark Mode**

<img src="screenshots/main-interface-dark.png" alt="Main Interface Dark" width="600">

**Add Station Dialog**

<img src="screenshots/add-station-dialog.png" alt="Add Station" width="600">

**Quick Import Feature**

<img src="screenshots/quick-import-dialog.png" alt="Quick Import" width="600">

</div>

## 🎯 Features

- **🔄 One-Click Station Switching**
  - Switch configurations instantly from menu bar or app
  - Apply settings to `~/.claude/settings.json` automatically
  - Backup original settings before applying changes

- **🔐 Military-Grade Security**
  - AES-256-CBC encryption for authentication tokens
  - Device-specific encryption keys
  - Tokens never stored in plaintext

- **⚙️ Flexible Configuration System**
  - Global base configuration for common settings
  - Per-station custom configurations
  - Smart config merging: base + station + custom
  - Visual JSON preview before applying

- **💰 Balance Tracking**
  - Manual balance entry (API integration ready for future)
  - Multi-currency support
  - Track usage across stations

- **🌍 Internationalization**
  - English & Chinese built-in
  - System language auto-detection
  - Easy to add more languages

- **🎨 Beautiful UI**
  - Native macOS integration with traffic lights
  - System dark mode support
  - Smooth animations and transitions
  - Privacy protection for sensitive data

## 📦 Installation

### Download

Get the latest version from [**Releases**](https://github.com/aydomini/CC-Bridge/releases)

| Platform | File | Status |
|----------|------|--------|
| **macOS (Apple Silicon)** | `CC Bridge-1.0.0-arm64.dmg` | ✅ Tested |
| **macOS (Intel)** | - | ⚠️ Not available yet |
| **Windows** | - | 🚧 Planned |
| **Linux** | - | 🚧 Planned |

> **Note**: v1.0.0 only supports macOS Apple Silicon (M1/M2/M3). Intel Mac, Windows, and Linux versions are planned for future releases. Community contributions welcome!

### System Requirements

- **macOS**: 10.13 (High Sierra) or later, Apple Silicon (M1/M2/M3) chip
- **Claude Code**: Must be installed at `~/.claude/`

## 🚀 Quick Start

1. **Add Your First Station**
   - Click the ➕ **Add Station** button
   - Enter station name (e.g., "Production", "Backup")
   - Paste your API base URL
   - Paste your authentication token
   - (Optional) Set custom configuration

2. **Apply Configuration**
   - Select the station you want to use
   - Click **Apply** to activate
   - CC Bridge will backup existing settings and apply the new configuration

3. **Quick Switching**
   - Use the menu bar icon for instant switching
   - Station status shown in app (Active/Inactive)
   - Last used timestamp tracked

4. **Advanced Configuration** (Optional)
   - Click **Base Config** to set global defaults
   - Use **Custom Config** per station for overrides
   - Preview merged settings before applying

## 🛠️ Development

### Prerequisites

- Node.js 16+ and npm
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/aydomini/CC-Bridge.git
cd CC-Bridge

# Install dependencies
npm install

# Run development mode (with hot reload)
npm run dev

# Build TypeScript and React app
npm run build

# Package for distribution
npm run package
```

### Project Structure

```
CC-Bridge/
├── electron/           # Electron main process
│   ├── main.ts        # App entry, IPC handlers
│   ├── preload.ts     # Context bridge
│   └── services/      # Core services
│       ├── configManager.ts    # CRUD for stations
│       ├── settingsWriter.ts   # Generate settings.json
│       └── encryption.ts       # Token encryption
├── src/               # React renderer process
│   ├── App.tsx        # Main component
│   ├── components/    # UI components
│   ├── types/         # TypeScript definitions
│   └── i18n/          # Translations
└── build/             # Build assets
```

> For detailed architecture documentation, see CLAUDE.md in the project source code

## 🤝 Contributing

Contributions are welcome! This is an open-source project for the Claude Code community.

**Ways to contribute:**

- 🐛 Report bugs via [GitHub Issues](https://github.com/aydomini/CC-Bridge/issues)
- 💡 Suggest features or improvements
- 🌍 Add translations for more languages
- 📖 Improve documentation
- 🔧 Submit pull requests

**Before submitting PRs:**

1. Ensure code follows existing style
2. Test on your platform
3. Update relevant documentation
4. Add yourself to contributors!

## 📝 License

MIT License - **Free and Open Source**

Copyright (c) 2025 aydomini

See [LICENSE](LICENSE) file for full details.

## 🙏 Acknowledgments

- Built with ❤️ for the Claude Code community
- Powered by [Electron](https://www.electronjs.org/) + [React](https://react.dev/)
- Icons and UI inspired by macOS design principles

## 📞 Support

- 🐛 [Report Issues](https://github.com/aydomini/CC-Bridge/issues)
- 💬 [Discussions](https://github.com/aydomini/CC-Bridge/discussions)

## 🗺️ Roadmap

- [ ] Automatic balance sync via station API
- [ ] Export/import station configurations
- [ ] Station health monitoring
- [ ] Usage statistics and charts
- [ ] Auto-update mechanism
- [ ] Windows & Linux testing and optimization

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=aydomini/CC-Bridge&type=Date)](https://star-history.com/#aydomini/CC-Bridge&Date)

---

<div align="center">

**Star ⭐ this repo if you find it useful!**

Made with ❤️ for the Claude Code community

</div>
