import React, { useState, useEffect } from 'react'
import { TransferStation, BaseConfig } from '../types/config'
import { CopyIcon } from './Icons'
import { useLanguage } from '../contexts/LanguageContext'
import './StationDialog.css'

interface Props {
  station: TransferStation | null
  onSave: (station: Omit<TransferStation, 'id' | 'createdAt'>) => void
  onClose: () => void
}

const StationDialog: React.FC<Props> = ({ station, onSave, onClose }) => {
  const { t } = useLanguage()
  const [inputMode, setInputMode] = useState<'simple' | 'json'>('simple')
  const [jsonInput, setJsonInput] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [baseConfig, setBaseConfig] = useState<BaseConfig | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    authToken: '',
    favicon: ''
  })

  const [customConfig, setCustomConfig] = useState<Partial<BaseConfig> | undefined>(undefined)
  const [useCustomConfig, setUseCustomConfig] = useState(false)
  const [customJsonValue, setCustomJsonValue] = useState('')
  const [customJsonError, setCustomJsonError] = useState('')

  // Load base config on mount
  useEffect(() => {
    const loadBaseConfig = async () => {
      try {
        const config = await window.electronAPI.getBaseConfig()
        setBaseConfig(config)
      } catch (error) {
        console.error('Failed to load base config:', error)
      }
    }
    loadBaseConfig()
  }, [])

  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name,
        baseUrl: station.baseUrl,
        authToken: station.authToken,
        favicon: station.favicon || ''
      })
      setCustomConfig(station.customConfig)
      setUseCustomConfig(!!station.customConfig)
      if (station.customConfig) {
        setCustomJsonValue(JSON.stringify(station.customConfig, null, 2))
      }
    }
  }, [station])

  // Auto-fetch favicon and suggest name when baseUrl changes
  const handleBaseUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, baseUrl: url }))

    // Try to get favicon
    if (url) {
      try {
        const urlObj = new URL(url)
        const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`
        setFormData(prev => ({ ...prev, favicon: faviconUrl }))

        // Auto-fill name if empty (only for new stations)
        if (!formData.name && !station) {
          const suggestedName = generateNameFromUrl(url)
          if (suggestedName) {
            setFormData(prev => ({ ...prev, name: suggestedName }))
          }
        }
      } catch (error) {
        // Invalid URL, ignore
      }
    }
  }

  const generateNameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.replace('www.', '')
      const parts = hostname.split('.')

      // Extract main domain name (e.g., api.example.com -> example, example.com -> example)
      const name = parts.length >= 2 ? parts[parts.length - 2] : parts[0]
      return name.charAt(0).toUpperCase() + name.slice(1)
    } catch {
      return ''
    }
  }

  const parseJsonConfig = (jsonStr: string) => {
    try {
      const config = JSON.parse(jsonStr)
      setJsonError('')

      // Support multiple formats:
      // 1. {env: {ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL, ...}, permissions: {...}}
      // 2. {ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL, ...} (flat format)
      let token = ''
      let url = ''
      let envData: Record<string, any> = {}
      let permissions = { allow: [], deny: [] }

      if (config.env) {
        // Format 1: nested env object
        token = config.env.ANTHROPIC_AUTH_TOKEN || ''
        url = config.env.ANTHROPIC_BASE_URL || ''
        envData = { ...config.env }
        permissions = config.permissions || permissions
      } else {
        // Format 2: flat format
        token = config.ANTHROPIC_AUTH_TOKEN || ''
        url = config.ANTHROPIC_BASE_URL || ''
        envData = { ...config }
      }

      // Provide specific error messages
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

      // Remove token and url from env to create customConfig
      const customEnv = { ...envData }
      delete customEnv.ANTHROPIC_AUTH_TOKEN
      delete customEnv.ANTHROPIC_BASE_URL

      const customCfg: Partial<BaseConfig> = {
        env: customEnv,
        permissions: permissions
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
    const parsed = parseJsonConfig(jsonInput)
    if (parsed) {
      // Auto-generate name if not already set
      const autoName = !formData.name ? generateNameFromUrl(parsed.baseUrl) : formData.name

      setFormData({
        ...formData,
        name: autoName,
        baseUrl: parsed.baseUrl,
        authToken: parsed.authToken
      })

      // Try to get favicon
      try {
        const urlObj = new URL(parsed.baseUrl)
        const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`
        setFormData(prev => ({ ...prev, favicon: faviconUrl }))
      } catch {
        // Invalid URL, ignore
      }

      // Automatically enable and set custom config with imported settings
      setCustomConfig(parsed.customConfig)
      // Re-stringify to ensure clean formatting (remove any extra whitespace)
      const cleanJson = JSON.stringify(JSON.parse(JSON.stringify(parsed.customConfig)), null, 2)
      setCustomJsonValue(cleanJson)
      setUseCustomConfig(true)
      setInputMode('simple')
      setJsonInput('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newStation: Omit<TransferStation, 'id' | 'createdAt'> = {
      name: formData.name,
      baseUrl: formData.baseUrl,
      authToken: formData.authToken,
      favicon: formData.favicon || undefined,
      customConfig: useCustomConfig ? customConfig : undefined
    }

    onSave(newStation)
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

  const generateFullConfig = () => {
    // Start with base config if available
    const config: any = baseConfig
      ? {
          env: { ...baseConfig.env },
          permissions: { ...baseConfig.permissions }
        }
      : {
          env: {},
          permissions: { allow: [], deny: [] }
        }

    // Override with station-specific auth
    config.env.ANTHROPIC_AUTH_TOKEN = formData.authToken
    config.env.ANTHROPIC_BASE_URL = formData.baseUrl

    // Merge custom config if enabled
    if (useCustomConfig && customConfig) {
      config.env = { ...config.env, ...customConfig.env }
      config.permissions = customConfig.permissions || config.permissions
    }

    return JSON.stringify(config, null, 2)
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog station-edit-dialog mini" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header mini">
          <h2>{station ? t('editStation') : t('addStationTitle')}</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-form">
          {/* Mode Toggle */}
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

          {inputMode === 'json' ? (
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
              {/* Basic Information */}
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

              {/* Custom Configuration */}
              <div className="form-section mini">
                <label className="checkbox-label mini">
                  <input
                    type="checkbox"
                    checked={useCustomConfig}
                    onChange={(e) => {
                      setUseCustomConfig(e.target.checked)
                      if (!e.target.checked) {
                        setCustomConfig(undefined)
                        setCustomJsonValue('')
                        setCustomJsonError('')
                      } else if (!customJsonValue) {
                        // Initialize with full base config (inherit all settings)
                        const defaultConfig = baseConfig
                          ? {
                              env: baseConfig.env || {},
                              permissions: baseConfig.permissions || { allow: [], deny: [] }
                            }
                          : { env: {}, permissions: { allow: [], deny: [] } }
                        setCustomJsonValue(JSON.stringify(defaultConfig, null, 2))
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
                    {customJsonError && <div className="error-message mini">{customJsonError}</div>}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Final Configuration Preview (only in simple mode) */}
          {inputMode === 'simple' && formData.baseUrl && formData.authToken && (
            <div className="form-section mini">
              <label className="section-label">{t('configPreview')}</label>
              <div className="textarea-with-copy">
                <pre className="config-preview mini">{generateFullConfig()}</pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generateFullConfig())}
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
