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
  providerKey?: string
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
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
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

const deriveProviderKeyFromUrl = (url: string): string => {
  const { core, hostname } = extractCoreNameFromUrl(url)
  const base = core || hostname
  return sanitizeProviderKey(base)
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
    favicon: '',
    providerKey: ''
  })

  const [customConfig, setCustomConfig] = useState<Partial<ClaudeBaseConfig> | Partial<CodexBaseConfig> | undefined>(undefined)
  const [useCustomConfig, setUseCustomConfig] = useState(false)
  const [customJsonValue, setCustomJsonValue] = useState('')
  const [customJsonError, setCustomJsonError] = useState('')
  const [providerKeyTouched, setProviderKeyTouched] = useState(false)

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
        favicon: station.favicon || '',
        providerKey: 'providerKey' in station ? station.providerKey || '' : ''
      })
      setCustomConfig(station.customConfig)
      setUseCustomConfig(!!station.customConfig)
      if (station.customConfig) {
        setCustomJsonValue(JSON.stringify(station.customConfig, null, 2))
      }
      const hasProviderKey = 'providerKey' in station && !!station.providerKey
      setProviderKeyTouched(hasProviderKey)
    } else {
      setFormData({
        name: '',
        baseUrl: '',
        authToken: '',
        favicon: '',
        providerKey: ''
      })
      setCustomConfig(undefined)
      setUseCustomConfig(false)
      setCustomJsonValue('')
      setJsonInput('')
      setProviderKeyTouched(false)
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

        if (isCodex && !providerKeyTouched) {
          setFormData(prev => ({ ...prev, providerKey: deriveProviderKeyFromUrl(url) }))
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

  const parseJsonConfig = (jsonStr: string) => {
    if (isCodex) return null
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

      const customCfg: Partial<ClaudeBaseConfig> = {
        env: customEnv,
        permissions
      }

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

  const handleJsonImport = () => {
    if (isCodex) return
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

      setCustomConfig(parsed.customConfig)
      const cleanJson = JSON.stringify(parsed.customConfig, null, 2)
      setCustomJsonValue(cleanJson)
      setUseCustomConfig(true)
      setInputMode('simple')
      setJsonInput('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isCodex) {
      const payload: Omit<CodexTransferStation, 'id' | 'createdAt'> = {
        name: formData.name,
        baseUrl: formData.baseUrl,
        authToken: formData.authToken,
        favicon: formData.favicon || undefined,
        providerKey: formData.providerKey || undefined,
        customConfig: useCustomConfig ? (customConfig as Partial<CodexBaseConfig> | undefined) : undefined
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
    const codexConfig = mergeCodexConfig(baseConfig as CodexBaseConfig, useCustomConfig ? (customConfig as Partial<CodexBaseConfig>) : undefined)
    const coreFromUrl = extractCoreNameFromUrl(formData.baseUrl)
    const derivedKey = sanitizeProviderKey(coreFromUrl.core || formData.name)
    const providerKey = sanitizeProviderKey(formData.providerKey || derivedKey)
    const providerName = formData.name || toTitleCase(coreFromUrl.core || providerKey)
    const modelProvider = (codexConfig.modelProvider && codexConfig.modelProvider.trim().length > 0
      ? codexConfig.modelProvider
      : providerKey) ?? providerKey

    const lines: string[] = []
    lines.push(`model_provider = "${modelProvider}"`)
    lines.push(`model = "${codexConfig.model}"`)
    if (codexConfig.modelReasoningEffort) {
      lines.push(`model_reasoning_effort = "${codexConfig.modelReasoningEffort}"`)
    }
    lines.push(`disable_response_storage = ${codexConfig.disableResponseStorage ? 'true' : 'false'}`)

    Object.entries(codexConfig.additionalSettings ?? {}).forEach(([key, value]) => {
      if (!key) return
      lines.push(`${key} = ${formatTomlValue(value)}`)
    })

    lines.push('')
    lines.push(`[model_providers.${providerKey}]`)
    lines.push(`name = "${providerName}"`)
    lines.push(`base_url = "${formData.baseUrl}"`)
    lines.push(`wire_api = "${codexConfig.wireApi}"`)
    lines.push(`requires_openai_auth = ${codexConfig.requiresOpenaiAuth ? 'true' : 'false'}`)

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
          {!isCodex && (
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
                {t('json')}
              </button>
            </div>
          )}

          {inputMode === 'json' && !isCodex ? (
            <div className="json-import-section mini">
              <textarea
                className="json-textarea mini"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={t('jsonPlaceholder')}
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

                {isCodex && (
                  <div className="form-group mini">
                    <label>{t('providerKey')}</label>
                    <input
                      type="text"
                      value={formData.providerKey || ''}
                      onChange={(e) => {
                        setProviderKeyTouched(true)
                        setFormData({ ...formData, providerKey: e.target.value })
                      }}
                      placeholder={t('providerKeyPlaceholder')}
                    />
                  </div>
                )}

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
                        if (!customJsonValue) {
                          const defaultConfig = baseConfig
                            ? JSON.stringify(baseConfig, null, 2)
                            : '{}'
                          setCustomJsonValue(defaultConfig)
                        }
                      } else {
                        setCustomConfig(undefined)
                        setCustomJsonValue('')
                        setCustomJsonError('')
                      }
                    }}
                  />
                  <span>{t('customConfig')}</span>
                </label>

                {useCustomConfig && (
                  <div className="custom-config-content mini">
                    <div className="textarea-with-copy">
                      <textarea
                        className="json-textarea mini"
                        value={customJsonValue}
                        onChange={(e) => {
                          setCustomJsonValue(e.target.value)
                          setCustomJsonError('')
                        }}
                        onBlur={handleSaveCustomConfig}
                        rows={isCodex ? 6 : 5}
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
                    {customJsonError && <div className="error-message mini">{customJsonError}</div>}
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
            {inputMode === 'json' && !isCodex && (
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
