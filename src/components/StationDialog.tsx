import React, { useState, useEffect } from 'react'
import {
  TransferStation,
  AppMode,
  ClaudeBaseConfig,
  CodexBaseConfig,
  ClaudeTransferStation,
  CodexTransferStation
} from '../types/config'
import { CopyIcon } from './Icons'
import { useLanguage } from '../contexts/LanguageContext'
import './StationDialog.css'

interface Props {
  mode: AppMode
  station: TransferStation | null
  onSave: (station: Omit<TransferStation, 'id' | 'createdAt'>) => void
  onClose: () => void
}

type StationFormState = {
  name: string
  baseUrl: string
  authToken: string
  favicon: string
}

const KNOWN_SECOND_LEVEL_TLDS = new Set(['co', 'com', 'net', 'org', 'gov', 'edu'])

const sanitizeProviderKey = (value: string): string =>
  (value || 'provider')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'provider'

const toTitleCase = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value

const normalizeJsonInput = (value: string): string =>
  removeNewlinesInsideStrings(
    value
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/，/g, ',')
      .replace(/：/g, ':')
      .replace(/\u00A0/g, ' ')
      .replace(/"(?=\s*\n\s*"[A-Za-z0-9_]+":)/g, '",')
  )

const removeNewlinesInsideStrings = (input: string): string => {
  let result = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (char === '\\' && !escaped) {
      escaped = true
      result += char
      continue
    }

    if (char === '"' && !escaped) {
      inString = !inString
      result += char
      continue
    }

    if (inString && (char === '\n' || char === '\r')) {
      escaped = false
      continue
    }

    result += char
    escaped = false
  }

  return result
}

const extractCoreNameFromUrl = (url: string): { core: string; hostname: string } => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/^www\./, '')
    const hostParts = hostname.split('.').filter(Boolean)

    let core = ''
    if (hostParts.length >= 2) {
      core = hostParts[hostParts.length - 2]
      const tld = hostParts[hostParts.length - 1]
      if (
        hostParts.length >= 3 &&
        (core.length <= 3 || KNOWN_SECOND_LEVEL_TLDS.has(core) || tld === 'cn')
      ) {
        core = hostParts[hostParts.length - 3]
      }
    } else if (hostParts.length === 1) {
      core = hostParts[0]
    }

    if (!core) {
      const pathSegment = urlObj.pathname.split('/').filter(Boolean)[0]
      if (pathSegment) {
        core = pathSegment
      }
    }

    return { core, hostname }
  } catch {
    return { core: '', hostname: '' }
  }
}

const formatTomlValue = (value: string | number | boolean): string => {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return Number.isFinite(value) ? `${value}` : `"${value}"`
  return `"${value}"`
}

const mergeCodexConfig = (
  base: CodexBaseConfig,
  custom?: Partial<CodexBaseConfig>
): CodexBaseConfig => ({
  modelProvider: custom?.modelProvider ?? base.modelProvider,
  model: custom?.model ?? base.model,
  modelReasoningEffort: custom?.modelReasoningEffort ?? base.modelReasoningEffort,
  disableResponseStorage: custom?.disableResponseStorage ?? base.disableResponseStorage,
  wireApi: custom?.wireApi ?? base.wireApi,
  requiresOpenaiAuth: custom?.requiresOpenaiAuth ?? base.requiresOpenaiAuth,
  additionalSettings: {
    ...(base.additionalSettings ?? {}),
    ...(custom?.additionalSettings ?? {})
  }
})

const StationDialog: React.FC<Props> = ({ mode, station, onSave, onClose }) => {
  const { t } = useLanguage()
  const isCodex = mode === 'codex'

  const [inputMode, setInputMode] = useState<'simple' | 'json'>(isCodex ? 'simple' : 'simple')
  const [jsonInput, setJsonInput] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [baseConfig, setBaseConfig] = useState<ClaudeBaseConfig | CodexBaseConfig | null>(null)

  const [formData, setFormData] = useState<StationFormState>({
    name: '',
    baseUrl: '',
    authToken: '',
    favicon: ''
  })

  const [customConfig, setCustomConfig] = useState<Partial<ClaudeBaseConfig> | Partial<CodexBaseConfig> | undefined>(undefined)
  const [useCustomConfig, setUseCustomConfig] = useState(false)
  const [customJsonValue, setCustomJsonValue] = useState('')
  const [customJsonError, setCustomJsonError] = useState('')
  const [rawTomlValue, setRawTomlValue] = useState('') // For Codex raw TOML
  const [codexConfigTab, setCodexConfigTab] = useState<'standard' | 'advanced'>('standard') // Codex config tab

  useEffect(() => {
    const loadBaseConfig = async () => {
      try {
        const config = await window.electronAPI.getBaseConfig(mode)
        setBaseConfig(config)
      } catch (error) {
        console.error('Failed to load base config:', error)
      }
    }
    loadBaseConfig()
  }, [mode])

  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name,
        baseUrl: station.baseUrl,
        authToken: station.authToken,
        favicon: station.favicon || ''
      })
      setCustomConfig(station.customConfig)
      setUseCustomConfig(!!station.customConfig || !!(station as CodexTransferStation).rawToml)

      if (station.customConfig) {
        setCustomJsonValue(JSON.stringify(station.customConfig, null, 2))
      }

      // Load rawToml for Codex stations
      if (isCodex && 'rawToml' in station) {
        setRawTomlValue((station as CodexTransferStation).rawToml || '')
      }
    } else {
      setFormData({
        name: '',
        baseUrl: '',
        authToken: '',
        favicon: ''
      })
      setCustomConfig(undefined)
      setUseCustomConfig(false)
      setCustomJsonValue('')
      setRawTomlValue('')
      setJsonInput('')
    }
  }, [station, mode])

  const handleBaseUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, baseUrl: url }))

    if (url) {
      try {
        const urlObj = new URL(url)
        const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`
        setFormData(prev => ({ ...prev, favicon: faviconUrl }))

        if (!formData.name && !station) {
          const suggestedName = generateNameFromUrl(url)
          if (suggestedName) {
            setFormData(prev => ({ ...prev, name: suggestedName }))
          }
        }
      } catch {
        // ignore invalid URL
      }
    }
  }

  const generateNameFromUrl = (url: string): string => {
    const { core } = extractCoreNameFromUrl(url)
    if (!core) return ''
    return toTitleCase(core)
  }

  const parseTomlConfig = (tomlStr: string) => {
    // Codex TOML 格式解析
    try {
      let token = ''
      let url = ''
      let modelProvider = ''
      let model = ''
      let modelReasoningEffort: string | undefined
      let disableResponseStorage: boolean | undefined
      let wireApi = ''
      let requiresOpenaiAuth: boolean | undefined
      const additionalSettings: Record<string, any> = {}

      // 先找到第一个section的位置,只解析顶层配置
      const firstSectionMatch = tomlStr.match(/\n\[/)
      const topLevelEnd = firstSectionMatch ? tomlStr.indexOf(firstSectionMatch[0]) : tomlStr.length
      const topLevelContent = tomlStr.slice(0, topLevelEnd)

      // 只解析顶层配置 (不包括任何section内的内容)
      const topLevelPattern = /^([a-z_]+)\s*=\s*(.+)$/gm
      let match: RegExpExecArray | null

      while ((match = topLevelPattern.exec(topLevelContent)) !== null) {
        const key = match[1].trim()
        let value = match[2].trim()

        // 移除引号
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1)
        }

        switch (key) {
          case 'model_provider':
            modelProvider = value
            break
          case 'model':
            model = value
            break
          case 'model_reasoning_effort':
            modelReasoningEffort = value
            break
          case 'disable_response_storage':
            disableResponseStorage = value === 'true'
            break
          default:
            // 其他顶层字段放入 additionalSettings
            if (value === 'true' || value === 'false') {
              additionalSettings[key] = value === 'true'
            } else if (!isNaN(Number(value))) {
              additionalSettings[key] = Number(value)
            } else {
              additionalSettings[key] = value
            }
        }
      }

      // 解析 provider section
      const providerSectionMatch = tomlStr.match(/\[model_providers\.([^\]]+)\]([\s\S]*?)(?=\n\[|$)/i)
      if (providerSectionMatch) {
        const providerContent = providerSectionMatch[2]
        const baseUrlMatch = providerContent.match(/base_url\s*=\s*"([^"]+)"/)
        const wireApiMatch = providerContent.match(/wire_api\s*=\s*"([^"]+)"/)
        const requiresMatch = providerContent.match(/requires_openai_auth\s*=\s*(true|false)/i)

        url = baseUrlMatch?.[1] || ''
        wireApi = wireApiMatch?.[1] || ''
        requiresOpenaiAuth = requiresMatch ? requiresMatch[1].toLowerCase() === 'true' : undefined
      }

      // 提取 MCP servers 和其他附加配置
      // 寻找第一个非 model_providers 的 section
      let rawToml = ''

      // 优先寻找标记
      const advancedMarkerIndex = tomlStr.indexOf('# --- ')
      if (advancedMarkerIndex !== -1) {
        rawToml = tomlStr.slice(advancedMarkerIndex)
      } else {
        // 否则提取所有 mcp_servers 和其他 sections
        const mcpStartMatch = tomlStr.match(/\[mcp_servers\./)
        if (mcpStartMatch && mcpStartMatch.index !== undefined) {
          rawToml = tomlStr.slice(mcpStartMatch.index)
        }
      }

      if (!url) {
        setJsonError(t('missingUrl'))
        return null
      }

      const customConfig: Partial<CodexBaseConfig> = {}
      if (modelProvider) customConfig.modelProvider = modelProvider
      if (model) customConfig.model = model
      if (modelReasoningEffort) customConfig.modelReasoningEffort = modelReasoningEffort
      if (disableResponseStorage !== undefined) customConfig.disableResponseStorage = disableResponseStorage
      if (wireApi) customConfig.wireApi = wireApi
      if (requiresOpenaiAuth !== undefined) customConfig.requiresOpenaiAuth = requiresOpenaiAuth
      if (Object.keys(additionalSettings).length > 0) customConfig.additionalSettings = additionalSettings

      setJsonError('')
      return {
        authToken: token,
        baseUrl: url,
        customConfig,
        rawToml: rawToml.trim() || undefined
      }
    } catch (error) {
      setJsonError(t('invalidJson'))
      return null
    }
  }

  const parseJsonConfig = (jsonStr: string) => {
    // Codex 模式: 优先尝试解析 TOML 格式
    if (isCodex && jsonStr.includes('[model_providers.')) {
      return parseTomlConfig(jsonStr)
    }

    // 尝试解析环境变量格式 (KEY=VALUE)
    const envLines = jsonStr.trim().split('\n')
    const looksLikeEnv = envLines.length > 0 && envLines.every(line => {
      const trimmed = line.trim()
      return !trimmed || trimmed.includes('=') || trimmed.startsWith('#')
    })

    if (looksLikeEnv) {
      // 解析环境变量格式
      try {
        let token = ''
        let url = ''

        // 模糊匹配辅助函数
        const normalizeKey = (key: string) => key.toUpperCase().replace(/[_-]/g, '')
        const cleanValue = (value: string) => {
          // 移除引号包裹
          let cleaned = value.trim()
          if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
              (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1)
          }
          return cleaned
        }

        // 定义匹配模式(优先级从高到低)
        const tokenPatterns = isCodex
          ? ['OPENAIAPI KEY', 'OPENAIAPIKEY', 'OPENAIKEY', 'APIKEY', 'AUTHTOKEN', 'TOKEN', 'KEY']
          : ['ANTHROPICAUTHTOKEN', 'ANTHROPICTOKEN', 'AUTHTOKEN', 'TOKEN', 'APIKEY', 'KEY']

        const urlPatterns = isCodex
          ? ['OPENAIBASEURL', 'OPENAIURL', 'BASEURL', 'APIURL', 'ENDPOINT', 'URL', 'HOST']
          : ['ANTHROPICBASEURL', 'ANTHROPICURL', 'BASEURL', 'APIURL', 'ENDPOINT', 'URL', 'HOST']

        for (const line of envLines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue

          const equalIndex = trimmed.indexOf('=')
          if (equalIndex === -1) continue

          const key = trimmed.slice(0, equalIndex).trim()
          const value = cleanValue(trimmed.slice(equalIndex + 1))

          if (!value) continue

          const normalizedKey = normalizeKey(key)

          // 匹配 Token/Key
          if (!token) {
            for (const pattern of tokenPatterns) {
              if (normalizedKey.includes(pattern)) {
                token = value
                break
              }
            }
          }

          // 匹配 URL
          if (!url) {
            for (const pattern of urlPatterns) {
              if (normalizedKey.includes(pattern)) {
                url = value
                break
              }
            }
          }
        }

        if (!token && !url) {
          setJsonError(t('missingToken') + ' and ' + t('missingUrl'))
          return null
        }
        if (!token) {
          setJsonError(t('missingToken'))
          return null
        }
        if (!url) {
          setJsonError(t('missingUrl'))
          return null
        }

        setJsonError('')
        return {
          authToken: token,
          baseUrl: url
          // 环境变量格式不包含自定义配置，不设置 customConfig
        }
      } catch (error) {
        setJsonError(t('invalidJson'))
        return null
      }
    }

    // Claude 模式: 尝试解析JSON格式
    if (!isCodex) {
      try {
        const cleaned = normalizeJsonInput(jsonStr)
        const config = JSON.parse(cleaned)
        setJsonError('')

        let token = ''
        let url = ''
        let envData: Record<string, any> = {}
        let permissions = { allow: [], deny: [] as string[] }

        if (config.env) {
          token = config.env.ANTHROPIC_AUTH_TOKEN || ''
          url = config.env.ANTHROPIC_BASE_URL || ''
          envData = { ...config.env }
          permissions = config.permissions || permissions
        } else {
          token = config.ANTHROPIC_AUTH_TOKEN || ''
          url = config.ANTHROPIC_BASE_URL || ''
          envData = { ...config }
        }

        if (!token && !url) {
          setJsonError(t('missingToken') + ' and ' + t('missingUrl'))
          return null
        }
        if (!token) {
          setJsonError(t('missingToken'))
          return null
        }
        if (!url) {
          setJsonError(t('missingUrl'))
          return null
        }

        const customEnv = { ...envData }
        delete customEnv.ANTHROPIC_AUTH_TOKEN
        delete customEnv.ANTHROPIC_BASE_URL

        // v1.2.3: Preserve all top-level custom fields
        const customCfg: Partial<ClaudeBaseConfig> = {
          ...config,  // Copy all top-level fields first
          env: customEnv,
          permissions
        }

        // Remove extracted fields that are now stored separately
        delete (customCfg as any).ANTHROPIC_AUTH_TOKEN
        delete (customCfg as any).ANTHROPIC_BASE_URL

        return {
          authToken: token,
          baseUrl: url,
          customConfig: customCfg
        }
      } catch (error) {
        setJsonError(t('invalidJson'))
        return null
      }
    }

    // Codex 模式: JSON 格式不支持
    setJsonError(t('invalidJson'))
    return null
  }

  const handleJsonImport = () => {
    const parsed = parseJsonConfig(jsonInput)
    if (parsed) {
      const autoName = !formData.name ? generateNameFromUrl(parsed.baseUrl) : formData.name

      setFormData(prev => ({
        ...prev,
        name: autoName,
        baseUrl: parsed.baseUrl,
        authToken: parsed.authToken
      }))

      try {
        const urlObj = new URL(parsed.baseUrl)
        const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`
        setFormData(prev => ({ ...prev, favicon: faviconUrl }))
      } catch {
        // ignore invalid URL
      }

      // 只有当存在 customConfig 或 rawToml 时才启用自定义配置
      const hasCustomConfig = parsed.customConfig && Object.keys(parsed.customConfig).length > 0
      const hasRawToml = 'rawToml' in parsed && parsed.rawToml

      if (hasCustomConfig) {
        setCustomConfig(parsed.customConfig)
        const cleanJson = JSON.stringify(parsed.customConfig, null, 2)
        setCustomJsonValue(cleanJson)
      }

      // 如果解析结果包含 rawToml,设置到附加配置
      if (hasRawToml) {
        setRawTomlValue(parsed.rawToml!)
      }

      // 只有当实际存在自定义内容时才启用自定义配置
      setUseCustomConfig(Boolean(hasCustomConfig || hasRawToml))
      setInputMode('simple')
      setJsonInput('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isCodex) {
      // Auto-generate providerKey from station name
      const providerKey = sanitizeProviderKey(formData.name)

      const payload: Omit<CodexTransferStation, 'id' | 'createdAt'> = {
        name: formData.name,
        baseUrl: formData.baseUrl,
        authToken: formData.authToken,
        favicon: formData.favicon || undefined,
        providerKey: providerKey,
        customConfig: useCustomConfig ? (customConfig as Partial<CodexBaseConfig> | undefined) : undefined,
        rawToml: useCustomConfig && rawTomlValue.trim() ? rawTomlValue.trim() : undefined
      }
      onSave(payload as Omit<TransferStation, 'id' | 'createdAt'>)
    } else {
      const payload: Omit<ClaudeTransferStation, 'id' | 'createdAt'> = {
        name: formData.name,
        baseUrl: formData.baseUrl,
        authToken: formData.authToken,
        favicon: formData.favicon || undefined,
        customConfig: useCustomConfig ? (customConfig as Partial<ClaudeBaseConfig> | undefined) : undefined
      }
      onSave(payload as Omit<TransferStation, 'id' | 'createdAt'>)
    }
  }

  const handleSaveCustomConfig = () => {
    // Validate JSON for both modes (standard config tab)
    try {
      const config = JSON.parse(customJsonValue)
      setCustomConfig(config)
      setCustomJsonError('')
    } catch (error) {
      setCustomJsonError(t('invalidJson'))
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(t('copyJson'))
    })
  }

  const buildClaudePreview = () => {
    if (!baseConfig) return ''
    const merged = {
      env: {
        ...(baseConfig as ClaudeBaseConfig).env,
        ANTHROPIC_AUTH_TOKEN: formData.authToken,
        ANTHROPIC_BASE_URL: formData.baseUrl
      },
      permissions: {
        ...((baseConfig as ClaudeBaseConfig).permissions || {})
      }
    }

    if (useCustomConfig && customConfig) {
      const cfg = customConfig as Partial<ClaudeBaseConfig>
      if (cfg.env) {
        Object.assign(merged.env, cfg.env)
      }
      if (cfg.permissions) {
        merged.permissions = {
          allow: cfg.permissions.allow ?? merged.permissions.allow,
          deny: cfg.permissions.deny ?? merged.permissions.deny
        }
      }
    }

    return JSON.stringify(merged, null, 2)
  }

  const buildCodexPreview = () => {
    if (!baseConfig) return ''

    // Merge base config with custom config (from standard config tab)
    const codexConfig = mergeCodexConfig(
      baseConfig as CodexBaseConfig,
      useCustomConfig ? (customConfig as Partial<CodexBaseConfig>) : undefined
    )

    // Auto-generate providerKey from station name
    const providerKey = sanitizeProviderKey(formData.name)
    const providerName = formData.name || 'Provider'
    const modelProvider = (codexConfig.modelProvider && codexConfig.modelProvider.trim().length > 0
      ? codexConfig.modelProvider
      : providerKey) ?? providerKey

    const lines: string[] = []

    // Top-level config fields (merged from base + custom)
    lines.push(`model_provider = "${modelProvider}"`)
    lines.push(`model = "${codexConfig.model}"`)
    if (codexConfig.modelReasoningEffort) {
      lines.push(`model_reasoning_effort = "${codexConfig.modelReasoningEffort}"`)
    }
    lines.push(`disable_response_storage = ${codexConfig.disableResponseStorage ? 'true' : 'false'}`)

    // Additional settings from merged config
    Object.entries(codexConfig.additionalSettings ?? {}).forEach(([key, value]) => {
      if (!key) return
      lines.push(`${key} = ${formatTomlValue(value)}`)
    })

    // Provider section
    lines.push('')
    lines.push(`[model_providers.${providerKey}]`)
    lines.push(`name = "${providerName}"`)
    lines.push(`base_url = "${formData.baseUrl}"`)
    lines.push(`wire_api = "${codexConfig.wireApi}"`)
    lines.push(`requires_openai_auth = ${codexConfig.requiresOpenaiAuth ? 'true' : 'false'}`)

    // Append raw TOML from advanced tab if provided
    if (useCustomConfig && rawTomlValue.trim()) {
      lines.push('')
      // 如果 rawToml 已经包含标记,不要重复添加
      const trimmedRawToml = rawTomlValue.trim()
      if (!trimmedRawToml.startsWith('# --- ')) {
        lines.push('# --- Advanced Configuration ---')
      }
      lines.push(trimmedRawToml)
    }

    return lines.join('\n')
  }

  const previewContent = isCodex ? buildCodexPreview() : buildClaudePreview()

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog station-edit-dialog mini" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header mini">
          <h2>{station ? t('editStation') : t('addStationTitle')}</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-form">
          <div className="mode-toggle mini">
            <button
              type="button"
              className={`mode-btn ${inputMode === 'simple' ? 'active' : ''}`}
              onClick={() => setInputMode('simple')}
            >
              {t('form')}
            </button>
            <button
              type="button"
              className={`mode-btn ${inputMode === 'json' ? 'active' : ''}`}
              onClick={() => setInputMode('json')}
            >
              {isCodex ? t('quickImport') : t('json')}
            </button>
          </div>

          {inputMode === 'json' ? (
            <div className="json-import-section mini">
              <textarea
                className="json-textarea mini"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={isCodex ? t('codexQuickImportPlaceholder') : t('claudeQuickImportPlaceholder')}
                rows={8}
              />
              {jsonError && <div className="error-message mini">{jsonError}</div>}
            </div>
          ) : (
            <>
              <div className="form-section mini">
                <div className="form-group mini">
                  <label>{t('stationName')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('stationNamePlaceholder')}
                    required
                  />
                </div>

                <div className="form-group mini">
                  <label>{t('stationUrl')}</label>
                  <div className="input-with-copy">
                    <input
                      type="url"
                      value={formData.baseUrl}
                      onChange={(e) => handleBaseUrlChange(e.target.value)}
                      placeholder={t('urlPlaceholder')}
                      required
                    />
                    <button
                      type="button"
                      className="btn-copy-embed-small"
                      onClick={() => copyToClipboard(formData.baseUrl)}
                      title={t('copyJson')}
                    >
                      <CopyIcon size={14} />
                    </button>
                  </div>
                </div>

                <div className="form-group mini">
                  <label>{t('stationToken')}</label>
                  <div className="input-with-copy">
                    <input
                      type="password"
                      value={formData.authToken}
                      onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                      placeholder={t('tokenPlaceholder')}
                      required
                    />
                    <button
                      type="button"
                      className="btn-copy-embed-small"
                      onClick={() => copyToClipboard(formData.authToken)}
                      title={t('copyJson')}
                    >
                      <CopyIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-section mini">
                <label className="checkbox-label mini">
                  <input
                    type="checkbox"
                    checked={useCustomConfig}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setUseCustomConfig(checked)
                      if (checked) {
                        if (!customJsonValue && !isCodex) {
                          // For Claude: Initialize with full base config
                          // For Codex: Leave empty, user can add fields as needed
                          const defaultConfig = baseConfig ? JSON.stringify(baseConfig, null, 2) : '{}'
                          setCustomJsonValue(defaultConfig)
                        }
                      } else {
                        setCustomConfig(undefined)
                        setCustomJsonValue('')
                        setCustomJsonError('')
                        setRawTomlValue('')
                      }
                    }}
                  />
                  <span>{t('customConfig')}</span>
                </label>

                {useCustomConfig && (
                  <div className="custom-config-content mini">
                    {isCodex ? (
                      // Codex mode: Dual-tab editor
                      <>
                        <div className="mode-toggle mini" style={{ marginTop: '8px' }}>
                          <button
                            type="button"
                            className={`mode-btn ${codexConfigTab === 'standard' ? 'active' : ''}`}
                            onClick={() => setCodexConfigTab('standard')}
                          >
                            {t('standardConfigTab')}
                          </button>
                          <button
                            type="button"
                            className={`mode-btn ${codexConfigTab === 'advanced' ? 'active' : ''}`}
                            onClick={() => setCodexConfigTab('advanced')}
                          >
                            {t('advancedTomlTab')}
                          </button>
                        </div>

                        {codexConfigTab === 'standard' ? (
                          // Standard config: JSON editor for structured fields
                          <div className="textarea-with-copy" style={{ marginTop: '8px' }}>
                            <textarea
                              className="json-textarea mini"
                              value={customJsonValue}
                              onChange={(e) => {
                                setCustomJsonValue(e.target.value)
                                setCustomJsonError('')
                              }}
                              onBlur={handleSaveCustomConfig}
                              rows={8}
                              placeholder={t('standardConfigHint')}
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(customJsonValue)}
                              className="btn-copy-embed"
                              title={t('copyJson')}
                            >
                              <CopyIcon size={14} />
                            </button>
                          </div>
                        ) : (
                          // Advanced config: Raw TOML editor
                          <div className="textarea-with-copy" style={{ marginTop: '8px' }}>
                            <textarea
                              className="json-textarea mini"
                              value={rawTomlValue}
                              onChange={(e) => setRawTomlValue(e.target.value)}
                              rows={8}
                              placeholder={t('advancedTomlHint')}
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(rawTomlValue)}
                              className="btn-copy-embed"
                              title={t('copyJson')}
                            >
                              <CopyIcon size={14} />
                            </button>
                          </div>
                        )}
                        {customJsonError && <div className="error-message mini">{customJsonError}</div>}
                      </>
                    ) : (
                      // Claude mode: JSON input
                      <div className="textarea-with-copy">
                        <textarea
                          className="json-textarea mini"
                          value={customJsonValue}
                          onChange={(e) => {
                            setCustomJsonValue(e.target.value)
                            setCustomJsonError('')
                          }}
                          onBlur={handleSaveCustomConfig}
                          rows={5}
                          placeholder={t('customConfigHint')}
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(customJsonValue)}
                          className="btn-copy-embed"
                          title={t('copyJson')}
                        >
                          <CopyIcon size={14} />
                        </button>
                      </div>
                    )}
                    {!isCodex && customJsonError && <div className="error-message mini">{customJsonError}</div>}
                  </div>
                )}
              </div>
            </>
          )}

          {inputMode === 'simple' && formData.baseUrl && formData.authToken && (
            <div className="form-section mini">
              <label className="section-label">{isCodex ? t('codexConfigPreview') : t('configPreview')}</label>
              <div className="textarea-with-copy">
                <pre className="config-preview mini">{previewContent}</pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(previewContent)}
                  className="btn-copy-embed"
                  title={t('copyJson')}
                >
                  <CopyIcon size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="dialog-actions mini">
            <button type="button" onClick={onClose} className="btn-secondary">{t('cancel')}</button>
            {inputMode === 'json' && (
              <button
                type="button"
                onClick={handleJsonImport}
                className="btn-primary"
                disabled={!jsonInput.trim()}
              >
                {t('import')}
              </button>
            )}
            {inputMode === 'simple' && (
              <button type="submit" className="btn-primary">
                {station ? t('update') : t('save')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default StationDialog
