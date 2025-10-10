<div align="center">

<img src="build/icon.png" alt="CC Bridge Logo" width="120" height="120">

# 🌉 CC Bridge

**一站式管理 Claude Code 与 Codex 中转站的桌面应用**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/v/release/aydomini/CC-Bridge)](https://github.com/aydomini/CC-Bridge/releases)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)]()

---

### [中文](README.md) | [English](README_EN.md)

</div>

---

## ✨ 项目简介

CC Bridge 是一款 **免费开源** 的 Electron + React 桌面应用，专为需要频繁切换多个中转站的开发者打造。现在同时支持 **Claude Code** 与 **OpenAI Codex** 两种模式，并提供统一的操作体验：

- 🔄 一键切换站点，自动备份历史配置
- 🔐 AES-256-CBC 设备级加密令牌
- ⚙️ 全局配置 + 站点定制 + 可视化预览
- 💰 余额追踪与多货币支持
- 🌍 内置中英双语，界面随时切换
- 🖥️ 菜单栏托盘列出双模式站点，随时切换

> **最新版本** 请见 [GitHub Releases](https://github.com/aydomini/CC-Bridge/releases)
> **当前构建**：macOS (Apple Silicon)。Windows / Linux / Intel macOS 仍在规划中，欢迎贡献。

## 📸 界面预览

<div align="center">

### 主界面（浅色模式）
<img src="screenshots/main-interface-light.png" alt="主界面浅色模式" width="700">

### 主界面（深色模式）
<img src="screenshots/main-interface-dark.png" alt="主界面深色模式" width="700">

### 添加站点对话框
<img src="screenshots/add-station-dialog.png" alt="添加站点" width="700">

### 快速导入（JSON）
<img src="screenshots/quick-import-dialog.png" alt="快速导入" width="700">

</div>

## 📦 安装说明

1. 从 [Releases](https://github.com/aydomini/CC-Bridge/releases) 下载最新版 DMG。  
2. 打开 DMG，将 **CC Bridge** 拖入「应用程序」。  
3. 第一次启动需要通过 Gatekeeper 验证：
   - 右键点击 → *打开* → 再点 *打开*，或  
   - 系统设置 ▸ 隐私与安全性 ▸ *仍要打开*，或  
   - `xattr -cr "/Applications/CC Bridge.app"`

当前版本使用临时签名（Adhoc Signing），未购买 Apple 开发者证书；源码全部开放，可自行审计。

## 🚀 快速上手

### 1. 添加站点

| 字段 | Claude 模式 | Codex 模式 |
|------|-------------|------------|
| 名称 | 站点名称（如“生产站”、“备用站”） | 同上 |
| Provider Key | 不需要 | 可选标识，默认根据域名生成 |
| URL | Claude 中转站地址 | Codex 中转站地址 |
| Token | `ANTHROPIC_AUTH_TOKEN` | `OPENAI_API_KEY` |
| 自定义配置 | JSON 覆盖全局设置 | 同上 |

- **快速导入**：Claude 模式支持粘贴 JSON，程序会自动修正中文标点、缺少逗号、智能引号、换行等问题。  
- Codex 目前以表单方式录入（TOML 将在未来升级）。

### 2. 应用配置

- 选择目标站点 ➜ 点击 **应用**。  
- Claude 写入 `~/.claude/settings.json`；Codex 写入 `~/.codex/config.toml` 与 `auth.json`。  
- 应用前自动生成时间戳备份；如检测到 Claude Code 正在运行，会提醒手动重启。

### 3. 菜单栏托盘

- 托盘菜单将 Claude / Codex 站点分组展示，可直接切换并同步到应用界面。  
- 如检测到系统设置与应用站点不一致，会在对应组别显示 ⚠️ 提醒。

## ⚙️ 功能亮点

- **双模式全局配置**  
  在「全局配置」中可分别维护 Claude / Codex 的默认值；清空文本并保存会自动恢复到内置安全配置。

- **令牌安全策略**  
  使用设备路径派生的 AES-256-CBC 密钥，加密存储站点令牌，且支持硬件变更后的自动迁移。

- **预览体验优化**  
  站点列表、配置预览、标题区均针对中英双语做了布局稳定优化，避免切换语言时高度跳动。

- **UI 精简调整**  
  顶部只保留主题切换、语言切换、全局配置、添加站点四个按钮，托盘承担隐藏/切换职责，界面更清爽。

## 🛠️ 本地开发

环境要求：**Node.js 16+**、**npm**、**git**

```bash
git clone https://github.com/aydomini/CC-Bridge.git
cd CC-Bridge
npm install

# 开发模式（带热重载）
npm run dev

# 构建 React / TypeScript
npm run build

# 打包 Electron
npm run package
```

目录结构简要：

```
CC-Bridge/
├── electron/          # 主进程：窗口、托盘、IPC
│   ├── main.ts        # 应用入口
│   ├── preload.ts     # 暴露 electronAPI
│   └── services/      # 配置存储、加密、文件写入
├── src/               # 渲染进程：React + TS
│   ├── App.tsx        # 核心页面逻辑
│   ├── components/    # UI 组件（弹窗、列表、图标）
│   ├── contexts/      # 主题 / 语言上下文
│   └── types/         # 共享类型定义
└── build/             # 静态资源、签名配置
```

## 🤝 参与项目

1. Fork & 基于 `main` 分支创建功能分支。
2. 注意同时支持 Claude / Codex 场景，文档需同步更新中英文。
3. 提交 PR 前务必执行 `npm run build` 并附上测试说明或截图。
4. Bug 与需求建议：请至 [GitHub Issues](https://github.com/aydomini/CC-Bridge/issues)。

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=aydomini/CC-Bridge&type=Date)](https://star-history.com/#aydomini/CC-Bridge&Date)

---

爱折腾，就来一起构建更好用的 CC Bridge 吧！🌟 如果项目帮到了你，欢迎点个 Star 支持。
