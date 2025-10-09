import React, { useState, useEffect } from 'react'
import {
  AppMode,
  ClaudeBaseConfig,
  CodexBaseConfig,
  DEFAULT_BASE_CONFIG,
  DEFAULT_CODEX_BASE_CONFIG
} from '../types/config'
import { CopyIcon } from './Icons'
import { useLanguage } from '../contexts/LanguageContext'
import './BaseConfigDialog.css'

interface Props {
  mode: AppMode
  onClose: () => void
}

const maskClaudeDisplay = (data: ClaudeBaseConfig, hiddenText: string): string => {
  try {
    const masked = JSON.parse(JSON.stringify(data))
    if (masked.env) {
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

const BaseConfigDialog: React.FC<Props> = ({ mode, onClose }) => {
  const { t } = useLanguage()
  const isCodex = mode === 'codex'

  const [claudeConfig, setClaudeConfig] = useState<ClaudeBaseConfig | null>(null)
  const [codexConfig, setCodexConfig] = useState<CodexBaseConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [jsonValue, setJsonValue] = useState('')
  const [displayValue, setDisplayValue] = useState('')
  const [jsonError, setJsonError] = useState('')

  useEffect(() => {
    loadConfig()
  }, [mode])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getBaseConfig(mode)
      if (isCodex) {
        setCodexConfig(data as CodexBaseConfig)
        const serialized = JSON.stringify(data, null, 2)
        setJsonValue(serialized)
        setDisplayValue(serialized)
      } else {
        setClaudeConfig(data as ClaudeBaseConfig)
        const serialized = JSON.stringify(data, null, 2)
        setJsonValue(serialized)
        setDisplayValue(maskClaudeDisplay(data as ClaudeBaseConfig, t('hidden')))
      }
    } catch (error) {
      console.error('Failed to load base config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (isCodex) {
      if (!displayValue.trim()) {
        await window.electronAPI.updateBaseConfig(mode, DEFAULT_CODEX_BASE_CONFIG)
        alert(t('baseConfigSaved'))
        await loadConfig()
        return
      }

      try {
        const parsed = JSON.parse(displayValue)
        setJsonError('')
        await window.electronAPI.updateBaseConfig(mode, parsed)
        alert(t('baseConfigSaved'))
        await loadConfig()
      } catch (error) {
        setJsonError(t('invalidJson'))
      }
      return
    }

    if (!displayValue.trim()) {
      await window.electronAPI.updateBaseConfig(mode, DEFAULT_BASE_CONFIG)
      alert(t('baseConfigSaved'))
      await loadConfig()
      return
    }

    try {
      const parsedConfig = JSON.parse(jsonValue) as ClaudeBaseConfig
      await window.electronAPI.updateBaseConfig(mode, parsedConfig)
      setJsonError('')
      alert(t('baseConfigSaved'))
      await loadConfig()
    } catch (error) {
      setJsonError(t('invalidJson'))
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonValue).then(() => {
      alert(t('copiedToClipboard'))
    })
  }

  if (loading || (!isCodex && !claudeConfig) || (isCodex && !codexConfig)) {
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

                if (isCodex) {
                  setJsonValue(newDisplay)
                  setJsonError('')
                  try {
                    const parsed = JSON.parse(newDisplay)
                    setCodexConfig(parsed)
                  } catch {
                    // ignore while typing
                  }
                  return
                }

                try {
                  const parsed = JSON.parse(newDisplay)
                  const current = JSON.parse(JSON.stringify(claudeConfig))

                  if (parsed.env) {
                    Object.keys(parsed.env).forEach(key => {
                      if (key === 'ANTHROPIC_AUTH_TOKEN' || key === 'ANTHROPIC_BASE_URL') {
                        if (parsed.env[key] !== t('hidden')) {
                          current.env[key] = parsed.env[key]
                        }
                      } else {
                        current.env[key] = parsed.env[key]
                      }
                    })
                  }

                  if (parsed.permissions) {
                    current.permissions = parsed.permissions
                  }

                  setClaudeConfig(current)
                  setJsonValue(JSON.stringify(current, null, 2))
                  setJsonError('')
                } catch {
                  // ignore while typing invalid JSON
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
