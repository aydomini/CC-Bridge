import React, { useState, useEffect } from 'react'
import { BaseConfig, DEFAULT_BASE_CONFIG } from '../types/config'
import { CopyIcon } from './Icons'
import { useLanguage } from '../contexts/LanguageContext'
import './BaseConfigDialog.css'

interface Props {
  onClose: () => void
}

// Function to mask only ANTHROPIC_AUTH_TOKEN and ANTHROPIC_BASE_URL in display
const getDisplayValue = (data: any, hiddenText: string): string => {
  try {
    const masked = JSON.parse(JSON.stringify(data))

    if (masked.env) {
      // Only hide these two specific fields in display
      if (masked.env.ANTHROPIC_AUTH_TOKEN) {
        masked.env.ANTHROPIC_AUTH_TOKEN = hiddenText
      }
      if (masked.env.ANTHROPIC_BASE_URL) {
        masked.env.ANTHROPIC_BASE_URL = hiddenText
      }
    }

    return JSON.stringify(masked, null, 2)
  } catch {
    return JSON.stringify(data, null, 2)
  }
}

const BaseConfigDialog: React.FC<Props> = ({ onClose }) => {
  const { t } = useLanguage()
  const [config, setConfig] = useState<BaseConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [jsonValue, setJsonValue] = useState('')
  const [displayValue, setDisplayValue] = useState('')
  const [jsonError, setJsonError] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    const data = await window.electronAPI.getBaseConfig()
    setConfig(data)
    setJsonValue(JSON.stringify(data, null, 2))
    setDisplayValue(getDisplayValue(data, t('hidden')))
    setLoading(false)
  }

  const handleSave = async () => {
    if (!config) return

    let configToSave = config

    // Check if user cleared the textarea (check displayValue, not jsonValue)
    if (!displayValue.trim()) {
      await window.electronAPI.updateBaseConfig(DEFAULT_BASE_CONFIG)
      alert(t('baseConfigSaved'))
      // Reload config to show the default values
      await loadConfig()
      return
    }

    try {
      const parsedConfig = JSON.parse(jsonValue)
      configToSave = parsedConfig
      setJsonError('')
    } catch (error) {
      setJsonError(t('invalidJson'))
      return
    }

    // Always ensure ANTHROPIC_AUTH_TOKEN and ANTHROPIC_BASE_URL are empty for privacy
    const sanitizedConfig = {
      ...configToSave,
      env: {
        ...configToSave.env,
        ANTHROPIC_AUTH_TOKEN: '',
        ANTHROPIC_BASE_URL: ''
      }
    }

    await window.electronAPI.updateBaseConfig(sanitizedConfig)
    alert(t('baseConfigSaved'))
    // Reload config to show the saved values
    await loadConfig()
  }

  const copyToClipboard = () => {
    // Always copy the full config (not the display version)
    navigator.clipboard.writeText(jsonValue).then(() => {
      alert(t('copiedToClipboard'))
    })
  }

  if (loading || !config) {
    return (
      <div className="dialog-overlay">
        <div className="dialog">{t('loading')}</div>
      </div>
    )
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog base-config-dialog mini" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header mini">
          <h2>{t('baseConfigTitle')}</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <div className="dialog-content mini">
          <div className="textarea-with-copy">
            <textarea
              className="json-textarea mini"
              value={displayValue}
              onChange={(e) => {
                const newDisplay = e.target.value
                setDisplayValue(newDisplay)

                try {
                  const displayParsed = JSON.parse(newDisplay)
                  const newConfig = JSON.parse(JSON.stringify(config))

                  if (displayParsed.env) {
                    Object.keys(displayParsed.env).forEach(key => {
                      if (key === 'ANTHROPIC_AUTH_TOKEN' || key === 'ANTHROPIC_BASE_URL') {
                        if (displayParsed.env[key] !== t('hidden')) {
                          newConfig.env[key] = displayParsed.env[key]
                        }
                      } else {
                        newConfig.env[key] = displayParsed.env[key]
                      }
                    })
                  }

                  if (displayParsed.permissions) {
                    newConfig.permissions = displayParsed.permissions
                  }

                  setConfig(newConfig)
                  setJsonValue(JSON.stringify(newConfig, null, 2))
                  setJsonError('')
                } catch {
                  // Invalid JSON, just update display
                }
              }}
              rows={12}
            />
            <button
              type="button"
              onClick={copyToClipboard}
              className="btn-copy-embed"
              title={t('copyJson')}
            >
              <CopyIcon size={14} />
            </button>
          </div>
          {jsonError && <div className="error-message mini">{jsonError}</div>}
        </div>

        <div className="dialog-actions mini">
          <button onClick={onClose} className="btn-secondary">{t('cancel')}</button>
          <button onClick={handleSave} className="btn-primary">{t('save')}</button>
        </div>
      </div>
    </div>
  )
}

export default BaseConfigDialog
