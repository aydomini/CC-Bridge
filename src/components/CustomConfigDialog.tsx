import React, { useState, useEffect } from 'react'
import { BaseConfig } from '../types/config'
import './CustomConfigDialog.css'

interface Props {
  initialConfig?: Partial<BaseConfig>
  onSave: (config: Partial<BaseConfig>) => void
  onClose: () => void
}

const CustomConfigDialog: React.FC<Props> = ({ initialConfig, onSave, onClose }) => {
  const [jsonValue, setJsonValue] = useState('')
  const [jsonError, setJsonError] = useState('')

  useEffect(() => {
    if (initialConfig) {
      setJsonValue(JSON.stringify(initialConfig, null, 2))
    } else {
      // Empty template
      setJsonValue(JSON.stringify({ env: {}, permissions: { allow: [], deny: [] } }, null, 2))
    }
  }, [initialConfig])

  const handleSave = () => {
    try {
      const config = JSON.parse(jsonValue)
      setJsonError('')
      onSave(config)
      onClose()
    } catch (error) {
      setJsonError('Invalid JSON format')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('✓ Copied to clipboard!')
    })
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog custom-config-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Custom Configuration</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <div className="dialog-content">
          <div className="config-toolbar">
            <p className="help-text">
              Configure station-specific settings. Leave empty fields to use global base config.
            </p>
            <div className="toolbar-actions">
              <button
                type="button"
                onClick={() => copyToClipboard(jsonValue)}
                className="btn-copy"
              >
                📋 Copy Config
              </button>
            </div>
          </div>

          <div className="json-edit-section">
            <textarea
              className="json-textarea"
              value={jsonValue}
              onChange={(e) => {
                setJsonValue(e.target.value)
                setJsonError('')
              }}
              rows={20}
              placeholder={`{\n  "env": {\n    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "32000",\n    "API_TIMEOUT_MS": "600000"\n  },\n  "permissions": {\n    "allow": [],\n    "deny": []\n  }\n}`}
            />
            {jsonError && <div className="error-message">{jsonError}</div>}
          </div>

          <p className="help-text" style={{ marginTop: '1rem' }}>
            💡 Only include settings you want to override. TOKEN and BASE_URL are managed separately.
          </p>
        </div>

        <div className="dialog-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save Custom Config
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomConfigDialog
