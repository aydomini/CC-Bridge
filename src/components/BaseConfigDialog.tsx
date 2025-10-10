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

  // Project config state
  const [projectConfig, setProjectConfig] = useState('')
  const [projectConfigLoading, setProjectConfigLoading] = useState(true)

  useEffect(() => {
    loadConfig()
    loadProjectConfig()
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

  const loadProjectConfig = async () => {
    setProjectConfigLoading(true)
    try {
      const content = await window.electronAPI.getProjectConfig(mode)
      setProjectConfig(content)
    } catch (error) {
      console.error('Failed to load project config:', error)
      setProjectConfig('')
    } finally {
      setProjectConfigLoading(false)
    }
  }

  const handleSave = async () => {
    // Save base config
    if (isCodex) {
      if (!displayValue.trim()) {
        await window.electronAPI.updateBaseConfig(mode, DEFAULT_CODEX_BASE_CONFIG)
      } else {
        try {
          const parsed = JSON.parse(displayValue)
          setJsonError('')
          await window.electronAPI.updateBaseConfig(mode, parsed)
        } catch (error) {
          setJsonError('')
          await window.electronAPI.updateBaseConfig(mode, codexConfig!)
        }
      }
    } else {
      if (!displayValue.trim()) {
        await window.electronAPI.updateBaseConfig(mode, DEFAULT_BASE_CONFIG)
      } else {
        try {
          const parsedConfig = JSON.parse(jsonValue) as ClaudeBaseConfig
          await window.electronAPI.updateBaseConfig(mode, parsedConfig)
          setJsonError('')
        } catch (error) {
          setJsonError(t('invalidJson'))
          return
        }
      }
    }

    // Save project config
    try {
      await window.electronAPI.updateProjectConfig(mode, projectConfig)
    } catch (error) {
      console.error('Failed to save project config:', error)
    }

    alert(t('baseConfigSaved'))
    await loadConfig()
    await loadProjectConfig()
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
          {/* Base Config Section */}
          <div className="config-section">
            <h3 className="section-title">{isCodex ? 'Codex' : 'Claude Code'} {t('baseConfig')}</h3>
            <p className="config-hint">
              {t('filePath')}: {isCodex ? '~/.codex/config.toml & ~/.codex/auth.json' : '~/.claude/settings.json'}
            </p>
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
                    setClaudeConfig(parsed)
                    setJsonValue(newDisplay)
                    setJsonError('')
                  } catch {
                    // ignore while typing invalid JSON
                  }
                }}
                rows={10}
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

          {/* Project Config Section */}
          <div className="config-section">
            <h3 className="section-title">
              {isCodex ? 'AGENTS.md' : 'CLAUDE.md'} {t('projectConfigTitle')}
            </h3>
            <p className="config-hint">
              {t('filePath')}: {isCodex ? '~/.codex/AGENTS.md' : '~/.claude/CLAUDE.md'}
            </p>
            {projectConfigLoading ? (
              <div className="loading-text">{t('loading')}</div>
            ) : (
              <textarea
                className="project-config-textarea"
                value={projectConfig}
                onChange={(e) => setProjectConfig(e.target.value)}
                placeholder={t('projectConfigPlaceholder')}
                rows={8}
              />
            )}
          </div>
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
