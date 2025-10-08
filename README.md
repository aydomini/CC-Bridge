<div align="center">

<img src="build/icon.png" alt="CC Bridge Logo" width="120" height="120">

# 🌉 CC Bridge

**一键轻松管理和切换多个 Claude Code 中转站**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/v/release/aydomini/CC-Bridge)](https://github.com/aydomini/CC-Bridge/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)]()

---

### [中文](#中文) | [English](README_EN.md)

</div>

---

## ✨ 什么是 CC Bridge？

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

| 平台 | 文件 | 状态 |
|------|------|------|
| **macOS (Apple Silicon)** | `CC Bridge-1.0.0-arm64.dmg` | ✅ 已测试 |
| **macOS (Intel)** | - | ⚠️ 暂未提供 |
| **Windows** | - | 🚧 计划支持 |
| **Linux** | - | 🚧 计划支持 |

> **注意**：v1.0.0 仅支持 macOS Apple Silicon (M1/M2/M3)。Intel Mac、Windows 和 Linux 版本计划在后续版本中提供。欢迎社区贡献！

#### 系统要求

- **macOS**: 10.13 (High Sierra) 或更高版本，Apple Silicon (M1/M2/M3) 芯片
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

> 完整架构文档请参阅项目源码中的 CLAUDE.md

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

- 🐛 [报告问题](https://github.com/aydomini/CC-Bridge/issues)
- 💬 [讨论区](https://github.com/aydomini/CC-Bridge/discussions)

### 🗺️ 路线图

- [ ] 通过站点 API 自动同步余额
- [ ] 导出/导入站点配置
- [ ] 站点健康监控
- [ ] 使用统计和图表
- [ ] 自动更新机制
- [ ] Windows 和 Linux 测试与优化

### ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=aydomini/CC-Bridge&type=Date)](https://star-history.com/#aydomini/CC-Bridge&Date)

**如果觉得有用,请给个 Star ⭐！**

---

<div align="center">

为 Claude Code 社区用 ❤️ 构建

</div>
