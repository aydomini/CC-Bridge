import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'en' | 'zh'

interface LanguageContextType {
  language: Language
  toggleLanguage: () => void
  t: (key: string) => string
}

const translations = {
  en: {
    // App
    appTitle: 'CC Bridge',
    appSubtitle: 'Manage Claude Code & Codex transfer stations with one click',

    // Header
    addStation: 'Add Station',
    baseConfig: 'Global Config',
    hideToTray: 'Hide to Menu Bar',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    switchLanguage: 'Switch Language',
    switchMode: 'Switch Mode',
    claudeMode: 'Claude Code',
    codexMode: 'Codex',
    currentMode: 'Mode',

    // Station List
    stationName: 'Name',
    stationUrl: 'URL',
    stationToken: 'Token',
    balance: 'Balance',
    lastUsed: 'Last',
    last: 'Last',
    never: 'Never',
    apply: 'Apply',
    edit: 'Edit',
    delete: 'Delete',
    notSet: 'Not set',
    unknownConfig: 'Unknown Configuration',
    externalConfigHint: 'Current settings.json contains a configuration not managed by this app',
    unknownConfigClaude: 'Current Claude Code configuration is not managed by this app',
    unknownConfigCodex: 'Current Codex configuration is not managed by this app',
    externalConfigHintClaude: 'Select a managed Claude Code station or switch mode to clear this warning.',
    externalConfigHintCodex: 'Select a managed Codex station or switch mode to clear this warning.',

    // Dialogs
    cancel: 'Cancel',
    save: 'Save',
    update: 'Update',
    import: 'Import',
    close: 'Close',

    // Balance Dialog
    setBalance: 'Set Balance',
    currency: 'Currency',
    amount: 'Amount',

    // Station Dialog
    editStation: 'Edit Station',
    addStationTitle: 'Add Station',
    customConfig: 'Custom Config',
    providerKey: 'Provider Key',
    providerKeyPlaceholder: 'Provider identifier (optional)',
    form: 'Manual Config',
    json: 'Quick Import',
    quickImport: 'Quick Import',
    simple: 'Simple',
    favicon: 'Favicon',
    faviconPlaceholder: 'Favicon URL (optional)',
    enableCustomConfig: 'Enable custom configuration',
    customConfigHint: 'Override global configuration for this station',
    customConfigHintCodex: 'Add additional TOML configuration (e.g., MCP servers)',
    standardConfigTab: 'Override (JSON)',
    advancedTomlTab: 'Additional (TOML)',
    standardConfigHint: '{\n  "model": "gpt-4",\n  "modelReasoningEffort": "medium"\n}',
    advancedTomlHint: '[[mcp_servers]]\nname = "filesystem"\ncommand = "npx"\nargs = ["-y", "@modelcontextprotocol/server-filesystem"]',
    copyJson: 'Copy JSON',
    jsonCopied: 'Copied!',
    noCustomConfig: 'No custom configuration',
    clickToAdd: 'Enable custom config to add station-specific settings',
    codexConfigPreview: 'Codex Config Preview',

    // Placeholders
    stationNamePlaceholder: 'Station name',
    urlPlaceholder: 'API endpoint URL',
    tokenPlaceholder: 'Authentication token',
    jsonPlaceholder: 'Paste your settings.json here',
    claudeQuickImportPlaceholder: 'Paste your configuration here. Supports:\n\n1. Environment variables:\n   ANTHROPIC_AUTH_TOKEN=sk-xxx\n   ANTHROPIC_BASE_URL=https://api.example.com\n\n2. JSON format:\n   {\n     "env": {\n       "ANTHROPIC_AUTH_TOKEN": "sk-xxx",\n       "ANTHROPIC_BASE_URL": "https://..."\n     }\n   }',
    codexQuickImportPlaceholder: 'Paste your configuration here. Supports:\n\n1. Environment variables:\n   OPENAI_API_KEY=sk-xxx\n   BASE_URL=https://api.example.com\n\n2. Full TOML config:\n   model_provider = "openai"\n   model = "gpt-4"\n   [model_providers.custom]\n   base_url = "https://..."\n   [[mcp_servers]]\n   name = "filesystem"',

    // Empty State
    noStations: 'No transfer stations yet',
    clickToStart: 'Click "Add Station" to get started',

    // Messages
    loading: 'Loading...',
    applySuccess: 'Configuration applied successfully!',
    applySuccessWithBackup: 'Configuration applied successfully!\n\nBackup saved to:\n',
    applyFailed: 'Failed to apply configuration:\n',
    deleteConfirm: 'Are you sure you want to delete this station?',
    applyConfirm: 'Apply configuration for',
    applyWarning: 'This will overwrite your current ~/.claude/settings.json\nThis action cannot be undone through this app.',
    claudeRunning: 'Claude Code is currently running. Please close it before applying configuration.',
    needRestartCC: 'Claude Code is running. Please restart it to apply the new configuration.',
    invalidJson: 'Invalid JSON format',
    missingFields: 'Missing required fields',
    missingToken: 'Missing ANTHROPIC_AUTH_TOKEN',
    missingUrl: 'Missing ANTHROPIC_BASE_URL',

    // Base Config Dialog
    baseConfigTitle: 'Global Base Configuration',
    baseConfigDescription: 'Configure default settings template for all transfer stations',
    configPreview: 'Configuration Preview',
    showSensitive: 'Show sensitive data',
    hideSensitive: 'Hide sensitive data',
    envVariables: 'Environment Variables',
    permissions: 'Permissions',
    allow: 'Allow',
    deny: 'Deny',
    addVariable: 'Add Variable',
    variableName: 'Variable Name',
    variableValue: 'Value',
    deleteVariable: 'Delete',
    baseConfigSaved: '✓ Base configuration saved successfully!',
    copiedToClipboard: '✓ Copied to clipboard!',
    hidden: '*** Hidden ***',

    // Project Config Dialog
    projectConfigTitle: 'Project Configuration',
    projectConfigDescription: 'Edit project-level configuration file',
    projectConfigSaved: '✓ Configuration saved successfully!',
    projectConfigEmpty: 'Configuration file is empty',
    projectConfigPlaceholder: 'Enter your project configuration here...',
    filePath: 'File Path'
  },
  zh: {
    // App
    appTitle: 'CC Bridge',
    appSubtitle: '一键管理 Claude Code 与 Codex 中转站',

    // Header
    addStation: '添加站点',
    baseConfig: '全局配置',
    hideToTray: '隐藏到菜单栏',
    darkMode: '暗色模式',
    lightMode: '亮色模式',
    switchLanguage: '切换语言',
    switchMode: '切换模式',
    claudeMode: 'Claude Code',
    codexMode: 'Codex',
    currentMode: '模式',

    // Station List
    stationName: '名称',
    stationUrl: '地址',
    stationToken: '令牌',
    balance: '余额',
    lastUsed: '最近使用',
    last: '最近',
    never: '从未',
    apply: '应用',
    edit: '编辑',
    delete: '删除',
    notSet: '未设置',
    unknownConfig: '未知配置',
    externalConfigHint: '当前 settings.json 包含非本应用管理的配置',
    unknownConfigClaude: '当前 Claude Code 配置不受本应用管理',
    unknownConfigCodex: '当前 Codex 配置不受本应用管理',
    externalConfigHintClaude: '请选择列表中的 Claude Code 站点或切换模式以清除该提示。',
    externalConfigHintCodex: '请选择列表中的 Codex 站点或切换模式以清除该提示。',

    // Dialogs
    cancel: '取消',
    save: '保存',
    update: '更新',
    import: '导入',
    close: '关闭',

    // Balance Dialog
    setBalance: '设置余额',
    currency: '货币',
    amount: '金额',

    // Station Dialog
    editStation: '编辑站点',
    addStationTitle: '添加站点',
    customConfig: '自定义配置',
    providerKey: '提供方标识',
    providerKeyPlaceholder: '提供方标识（可选）',
    form: '手动配置',
    json: '快速导入',
    quickImport: '快速导入',
    simple: '简单',
    favicon: '图标',
    faviconPlaceholder: '图标地址（可选）',
    enableCustomConfig: '启用自定义配置',
    customConfigHint: '为此站点覆盖全局配置',
    customConfigHintCodex: '添加额外的 TOML 配置（例如 MCP servers）',
    standardConfigTab: '覆写配置 (JSON)',
    advancedTomlTab: '附加配置 (TOML)',
    standardConfigHint: '{\n  "model": "gpt-4",\n  "modelReasoningEffort": "medium"\n}',
    advancedTomlHint: '[[mcp_servers]]\nname = "filesystem"\ncommand = "npx"\nargs = ["-y", "@modelcontextprotocol/server-filesystem"]',
    copyJson: '复制 JSON',
    jsonCopied: '已复制！',
    noCustomConfig: '无自定义配置',
    clickToAdd: '启用自定义配置以添加站点特定设置',
    codexConfigPreview: 'Codex 配置预览',

    // Placeholders
    stationNamePlaceholder: '站点名称',
    urlPlaceholder: 'API 端点地址',
    tokenPlaceholder: '认证令牌',
    jsonPlaceholder: '在此粘贴您的 settings.json',
    claudeQuickImportPlaceholder: '在此粘贴您的配置，支持以下格式：\n\n1. 环境变量格式：\n   ANTHROPIC_AUTH_TOKEN=sk-xxx\n   ANTHROPIC_BASE_URL=https://api.example.com\n\n2. JSON 格式：\n   {\n     "env": {\n       "ANTHROPIC_AUTH_TOKEN": "sk-xxx",\n       "ANTHROPIC_BASE_URL": "https://..."\n     }\n   }',
    codexQuickImportPlaceholder: '在此粘贴您的配置，支持以下格式：\n\n1. 环境变量格式：\n   OPENAI_API_KEY=sk-xxx\n   BASE_URL=https://api.example.com\n\n2. 完整 TOML 配置：\n   model_provider = "openai"\n   model = "gpt-4"\n   [model_providers.custom]\n   base_url = "https://..."\n   [[mcp_servers]]\n   name = "filesystem"',

    // Empty State
    noStations: '暂无中转站点',
    clickToStart: '点击"添加站点"开始使用',

    // Messages
    loading: '加载中...',
    applySuccess: '配置已成功应用！',
    applySuccessWithBackup: '配置已成功应用！\n\n备份保存至：\n',
    applyFailed: '应用配置失败：\n',
    deleteConfirm: '确定要删除这个站点吗？',
    applyConfirm: '应用配置',
    applyWarning: '这将覆盖当前的 ~/.claude/settings.json\n此操作无法通过本应用撤销。',
    claudeRunning: 'Claude Code 正在运行中。请先关闭后再应用配置。',
    needRestartCC: 'Claude Code 正在运行中。请重启以应用新配置。',
    invalidJson: 'JSON 格式错误',
    missingFields: '缺少必填字段',
    missingToken: '缺少 ANTHROPIC_AUTH_TOKEN',
    missingUrl: '缺少 ANTHROPIC_BASE_URL',

    // Base Config Dialog
    baseConfigTitle: '全局基础配置',
    baseConfigDescription: '配置所有中转站点的默认设置模板',
    configPreview: '配置预览',
    showSensitive: '显示敏感数据',
    hideSensitive: '隐藏敏感数据',
    envVariables: '环境变量',
    permissions: '权限',
    allow: '允许',
    deny: '拒绝',
    addVariable: '添加变量',
    variableName: '变量名',
    variableValue: '值',
    deleteVariable: '删除',
    baseConfigSaved: '✓ 基础配置已成功保存！',
    copiedToClipboard: '✓ 已复制到剪贴板！',
    hidden: '*** 已隐藏 ***',

    // Project Config Dialog
    projectConfigTitle: '项目配置',
    projectConfigDescription: '编辑项目级配置文件',
    projectConfigSaved: '✓ 配置已成功保存！',
    projectConfigEmpty: '配置文件为空',
    projectConfigPlaceholder: '在此输入您的项目配置...',
    filePath: '文件路径'
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Chinese, load user preference if exists
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language')

    // 如果没有保存的语言,默认中文
    if (!saved) {
      localStorage.setItem('language', 'zh')
      return 'zh'
    }

    // 使用保存的语言
    return saved as Language
  })

  useEffect(() => {
    localStorage.setItem('language', language)
    // Notify main process about language change
    window.electronAPI?.notifyLanguageChange?.(language)
  }, [language])

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en')
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key
  }

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
