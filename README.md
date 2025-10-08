# CC Bridge

<div align="center">

![CC Bridge Logo](build/icon.png)

🌉 **CC Bridge** - 一键轻松管理和切换多个 Claude Code 中转站

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/v/release/aydomini/CC-Bridge)](https://github.com/aydomini/CC-Bridge/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)]()

[中文](#中文) | [English](#english)

</div>

---

## 中文

### ✨ 什么是 CC Bridge？

CC Bridge 是一个**免费开源**的桌面应用程序，让你可以轻松管理多个 Claude Code 中转站配置。在不同的 API 端点之间切换、安全管理认证令牌、为每个站点自定义设置 - 一切都通过美观直观的界面完成。

适合以下开发者：
- 🔄 使用多个 Claude Code 中转站
- 🔐 需要安全的令牌管理
- ⚙️ 想要为每个站点自定义配置
- 💰 追踪 API 使用情况和余额
- 🌍 多语言工作环境

### 📸 应用截图

<div align="center">

**主界面 - 浅色模式**

<img src="screenshots/main-interface-light.png" alt="主界面 - 浅色模式" width="600">

**主界面 - 深色模式**

<img src="screenshots/main-interface-dark.png" alt="主界面 - 深色模式" width="600">

**添加站点对话框**

<img src="screenshots/add-station-dialog.png" alt="添加站点" width="600">

**快速导入功能**

<img src="screenshots/quick-import-dialog.png" alt="快速导入" width="600">

</div>

### 🎯 功能特性

- **🔄 一键切换站点**
  - 从菜单栏或应用内即时切换配置
  - 自动应用设置到 `~/.claude/settings.json`
  - 应用前自动备份原有设置

- **🔐 军事级加密**
  - 使用 AES-256-CBC 加密认证令牌
  - 设备专属加密密钥
  - 令牌永不明文存储

- **⚙️ 灵活配置系统**
  - 全局基础配置用于通用设置
  - 每个站点的自定义配置
  - 智能配置合并：基础 + 站点 + 自定义
  - 应用前可视化 JSON 预览

- **💰 余额追踪**
  - 手动输入余额（已为未来 API 集成做好准备）
  - 支持多种货币
  - 跨站点追踪使用情况

- **🌍 国际化**
  - 内置中英文支持
  - 系统语言自动检测
  - 易于添加更多语言

- **🎨 精美界面**
  - 原生 macOS 集成与交通灯按钮
  - 支持系统深色模式
  - 流畅的动画和过渡效果
  - 敏感数据隐私保护

### 📦 安装

#### 下载

从 [**Releases**](https://github.com/aydomini/CC-Bridge/releases) 获取最新版本

| 平台 | 文件 | 状态 | 安装方式 |
|------|------|------|----------|
| **macOS** | `CC-Bridge-{version}.dmg` | ✅ 已测试 | 打开 DMG 并拖拽到应用程序文件夹 |
| **Windows** | `CC-Bridge-Setup-{version}.exe` | ⚠️ 未测试 | 运行安装程序 |
| **Linux** | `CC-Bridge-{version}.AppImage` | ⚠️ 未测试 | `chmod +x` 后执行 |

> **注意**：目前仅在 macOS 上测试过。Windows 和 Linux 版本已提供但作者尚未验证。欢迎社区测试！

#### 系统要求

- **macOS**: 10.13 (High Sierra) 或更高版本
- **Windows**: Windows 7 或更高版本
- **Linux**: Ubuntu 18.04+ 或同等版本
- **Claude Code**: 必须安装在 `~/.claude/`

### 🚀 快速开始

1. **添加第一个站点**
   - 点击 ➕ **添加站点** 按钮
   - 输入站点名称（如 "生产环境"、"备用站点"）
   - 粘贴 API 基础 URL
   - 粘贴认证令牌
   - （可选）设置自定义配置

2. **应用配置**
   - 选择要使用的站点
   - 点击 **应用** 激活
   - CC Bridge 会备份现有设置并应用新配置

3. **快速切换**
   - 使用菜单栏图标即时切换
   - 应用内显示站点状态（活跃/非活跃）
   - 追踪最后使用时间

4. **高级配置**（可选）
   - 点击 **基础配置** 设置全局默认值
   - 使用 **自定义配置** 为单个站点设置覆盖
   - 应用前预览合并后的设置

### 🛠️ 开发

#### 前置要求

- Node.js 16+ 和 npm
- Git

#### 设置

```bash
# 克隆仓库
git clone https://github.com/aydomini/CC-Bridge.git
cd CC-Bridge

# 安装依赖
npm install

# 开发模式运行（支持热重载）
npm run dev

# 构建 TypeScript 和 React 应用
npm run build

# 打包分发版本
npm run package
```

#### 项目结构

```
CC-Bridge/
├── electron/           # Electron 主进程
│   ├── main.ts        # 应用入口，IPC 处理器
│   ├── preload.ts     # 上下文桥接
│   └── services/      # 核心服务
│       ├── configManager.ts    # 站点的 CRUD 操作
│       ├── settingsWriter.ts   # 生成 settings.json
│       └── encryption.ts       # 令牌加密
├── src/               # React 渲染进程
│   ├── App.tsx        # 主组件
│   ├── components/    # UI 组件
│   ├── types/         # TypeScript 类型定义
│   └── i18n/          # 翻译文件
└── build/             # 构建资源
```

详细架构文档请参阅 [CLAUDE.md](CLAUDE.md)。

### 🤝 贡献

欢迎贡献！这是一个为 Claude Code 社区打造的开源项目。

**贡献方式：**
- 🐛 通过 [GitHub Issues](https://github.com/aydomini/CC-Bridge/issues) 报告 bug
- 💡 提出功能建议或改进意见
- 🌍 添加更多语言的翻译
- 📖 改进文档
- 🔧 提交 pull request

**提交 PR 前：**
1. 确保代码遵循现有风格
2. 在你的平台上测试
3. 更新相关文档
4. 将自己添加到贡献者名单！

### 📝 开源协议

MIT License - **免费开源**

Copyright (c) 2025 aydomini

完整详情请查看 [LICENSE](LICENSE) 文件。

### 🙏 致谢

- 为 Claude Code 社区用 ❤️ 构建
- 基于 [Electron](https://www.electronjs.org/) + [React](https://react.dev/)
- 图标和 UI 设计灵感来自 macOS 设计原则

### 📞 支持

- 📖 阅读[文档](CLAUDE.md)
- 🐛 [报告问题](https://github.com/aydomini/CC-Bridge/issues)
- 💬 [讨论区](https://github.com/aydomini/CC-Bridge/discussions)

### 🗺️ 路线图

- [ ] 通过站点 API 自动同步余额
- [ ] 导出/导入站点配置
- [ ] 站点健康监控
- [ ] 使用统计和图表
- [ ] 自动更新机制
- [ ] Windows 和 Linux 测试与优化

**如果觉得有用，请给个 Star ⭐！**

---

## English

### ✨ What is CC Bridge?

CC Bridge is a **free and open-source** desktop application that allows you to manage multiple Claude Code transfer station configurations effortlessly. Switch between different API endpoints, manage authentication tokens securely, and customize settings per station - all with a beautiful, intuitive interface.

Perfect for developers who:
- 🔄 Use multiple Claude Code transfer stations
- 🔐 Need secure token management
- ⚙️ Want per-station custom configurations
- 💰 Track API usage and balances
- 🌍 Work in multiple languages

### 📸 Screenshots

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

### 🎯 Features

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

### 📦 Installation

#### Download

Get the latest version from [**Releases**](https://github.com/aydomini/CC-Bridge/releases)

| Platform | File | Status | Installation |
|----------|------|--------|--------------|
| **macOS** | `CC-Bridge-{version}.dmg` | ✅ Tested | Open DMG and drag to Applications |
| **Windows** | `CC-Bridge-Setup-{version}.exe` | ⚠️ Untested | Run the installer |
| **Linux** | `CC-Bridge-{version}.AppImage` | ⚠️ Untested | `chmod +x` then execute |

> **Note**: Currently only tested on macOS. Windows and Linux builds are provided but not yet verified by the author. Community testing welcome!

#### System Requirements

- **macOS**: 10.13 (High Sierra) or later
- **Windows**: Windows 7 or later
- **Linux**: Ubuntu 18.04+ or equivalent
- **Claude Code**: Must be installed at `~/.claude/`

### 🚀 Quick Start

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

### 🛠️ Development

#### Prerequisites

- Node.js 16+ and npm
- Git

#### Setup

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

#### Project Structure

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

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

### 🤝 Contributing

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

### 📝 License

MIT License - **Free and Open Source**

Copyright (c) 2025 aydomini

See [LICENSE](LICENSE) file for full details.

### 🙏 Acknowledgments

- Built with ❤️ for the Claude Code community
- Powered by [Electron](https://www.electronjs.org/) + [React](https://react.dev/)
- Icons and UI inspired by macOS design principles

### 📞 Support

- 📖 Read the [Documentation](CLAUDE.md)
- 🐛 [Report Issues](https://github.com/aydomini/CC-Bridge/issues)
- 💬 [Discussions](https://github.com/aydomini/CC-Bridge/discussions)

### 🗺️ Roadmap

- [ ] Automatic balance sync via station API
- [ ] Export/import station configurations
- [ ] Station health monitoring
- [ ] Usage statistics and charts
- [ ] Auto-update mechanism
- [ ] Windows & Linux testing and optimization

**Star ⭐ this repo if you find it useful!**

---

<div align="center">

Made with ❤️ for the Claude Code community

</div>
