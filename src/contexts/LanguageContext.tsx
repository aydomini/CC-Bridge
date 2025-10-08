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
    appSubtitle: 'One-click switch for Claude Code transfer stations',

    // Header
    addStation: 'Add Station',
    baseConfig: 'Global Config',
    hideToTray: 'Hide to Menu Bar',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    switchLanguage: 'Switch Language',

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
    form: 'Manual Config',
    json: 'Quick Import',
    simple: 'Simple',
    favicon: 'Favicon',
    faviconPlaceholder: 'Favicon URL (optional)',
    enableCustomConfig: 'Enable custom configuration',
    customConfigHint: 'Override global configuration for this station',
    copyJson: 'Copy JSON',
    jsonCopied: 'Copied!',
    noCustomConfig: 'No custom configuration',
    clickToAdd: 'Enable custom config to add station-specific settings',

    // Placeholders
    stationNamePlaceholder: 'Station name',
    urlPlaceholder: 'API endpoint URL',
    tokenPlaceholder: 'Authentication token',
    jsonPlaceholder: 'Paste your settings.json here',

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
    hidden: '*** Hidden ***'
  },
  zh: {
    // App
    appTitle: 'CC Bridge',
    appSubtitle: '一键切换 Claude Code 中转站',

    // Header
    addStation: '添加站点',
    baseConfig: '全局配置',
    hideToTray: '隐藏到菜单栏',
    darkMode: '暗色模式',
    lightMode: '亮色模式',
    switchLanguage: '切换语言',

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
    form: '手动配置',
    json: '快速导入',
    simple: '简单',
    favicon: '图标',
    faviconPlaceholder: '图标地址（可选）',
    enableCustomConfig: '启用自定义配置',
    customConfigHint: '为此站点覆盖全局配置',
    copyJson: '复制 JSON',
    jsonCopied: '已复制！',
    noCustomConfig: '无自定义配置',
    clickToAdd: '启用自定义配置以添加站点特定设置',

    // Placeholders
    stationNamePlaceholder: '站点名称',
    urlPlaceholder: 'API 端点地址',
    tokenPlaceholder: '认证令牌',
    jsonPlaceholder: '在此粘贴您的 settings.json',

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
    hidden: '*** 已隐藏 ***'
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en')

  // Auto-detect system language on mount
  useEffect(() => {
    const initLanguage = async () => {
      // Always get system preferences first
      let systemLanguage: Language = 'en'
      try {
        const prefs = await window.electronAPI.getSystemPreferences()
        const systemLocale = prefs.locale.toLowerCase()
        systemLanguage = systemLocale.startsWith('zh') ? 'zh' : 'en'
      } catch (error) {
        console.error('[LanguageContext] Failed to get system preferences:', error)
      }

      // Check if user has manually set a preference
      const saved = localStorage.getItem('language')
      const userSetLanguage = localStorage.getItem('language-user-set')

      if (saved && userSetLanguage === 'true') {
        // User has manually set language, respect their choice
        setLanguage(saved as Language)
      } else {
        // Use system language
        setLanguage(systemLanguage)
        // Clear the flag since we're following system
        localStorage.removeItem('language-user-set')
      }
    }
    initLanguage()
  }, [])

  useEffect(() => {
    localStorage.setItem('language', language)
    // Notify main process about language change
    window.electronAPI?.notifyLanguageChange?.(language)
  }, [language])

  const toggleLanguage = () => {
    setLanguage(prev => {
      const newLanguage = prev === 'en' ? 'zh' : 'en'
      // Mark that user has manually set language
      localStorage.setItem('language-user-set', 'true')
      return newLanguage
    })
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
