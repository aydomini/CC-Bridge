import { useState, useEffect, useRef } from 'react'
import { TransferStation, Currency, AppMode } from './types/config'
import StationList from './components/StationList'
import StationDialog from './components/StationDialog'
import BaseConfigDialog from './components/BaseConfigDialog'
import BalanceDialog from './components/BalanceDialog'
import AppIcon from './components/AppIcon'
import { MoonIcon, SunIcon, GlobeIcon, WrenchIcon, PlusIcon } from './components/Icons'
import { useTheme } from './contexts/ThemeContext'
import { useLanguage } from './contexts/LanguageContext'
import './App.css'

const MODES: AppMode[] = ['claude', 'codex']

function App() {
  const { theme, toggleTheme } = useTheme()
  const { toggleLanguage, t } = useLanguage()
  const [stations, setStations] = useState<TransferStation[]>([])
  const [mode, setMode] = useState<AppMode>('claude')
  const modeRef = useRef<AppMode>('claude')
  const stationsRef = useRef<TransferStation[]>([])

  const [showStationDialog, setShowStationDialog] = useState(false)
  const [showBaseConfigDialog, setShowBaseConfigDialog] = useState(false)
  const [showBalanceDialog, setShowBalanceDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState<AppMode>('claude')
  const [balanceMode, setBalanceMode] = useState<AppMode>('claude')
  const [editingStation, setEditingStation] = useState<TransferStation | null>(null)
  const [balanceStation, setBalanceStation] = useState<TransferStation | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeStationId, setActiveStationId] = useState<string | null>(null)
  const [hasExternalConfig, setHasExternalConfig] = useState(false)

  const refreshStations = async (): Promise<TransferStation[]> => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getStations(modeRef.current)
      stationsRef.current = data
      setStations(data)
      return data
    } catch (error) {
      console.error('Failed to load stations:', error)
      stationsRef.current = []
      setStations([])
      return []
    } finally {
      setLoading(false)
    }
  }

  const detectActiveStation = async (
    stationList: TransferStation[] = stationsRef.current,
    targetMode: AppMode = modeRef.current
  ) => {
    try {
      const [settingsSnapshot, storedActiveId] = await Promise.all([
        window.electronAPI.getCurrentSettings(targetMode),
        window.electronAPI.getActiveStationId(targetMode)
      ])

      let matchedId: string | null = null
      let externalConfig = false

      if (settingsSnapshot) {
        if (settingsSnapshot.mode !== targetMode) {
          externalConfig = true
        } else if (settingsSnapshot.mode === 'claude') {
          const currentUrl = settingsSnapshot.settings.env?.ANTHROPIC_BASE_URL
          const currentToken = settingsSnapshot.settings.env?.ANTHROPIC_AUTH_TOKEN
          if (currentUrl && currentToken) {
            const matched = stationList.find(s => s.baseUrl === currentUrl && s.authToken === currentToken)
            if (matched) {
              matchedId = matched.id
            } else {
              const urlMatch = stationList.find(s => s.baseUrl === currentUrl)
              if (urlMatch) {
                matchedId = urlMatch.id
              } else {
                externalConfig = true
              }
            }
          }
        } else {
          const { baseUrl, authToken } = settingsSnapshot.settings
          if (baseUrl && authToken) {
            const matched = stationList.find(s => s.baseUrl === baseUrl && s.authToken === authToken)
            if (matched) {
              matchedId = matched.id
            } else {
              const urlMatch = stationList.find(s => s.baseUrl === baseUrl)
              if (urlMatch) {
                matchedId = urlMatch.id
              } else {
                externalConfig = true
              }
            }
          }
        }
      }

      if (!matchedId && storedActiveId) {
        matchedId = storedActiveId
      }

      setActiveStationId(matchedId ?? null)
      setHasExternalConfig(externalConfig)
    } catch (error) {
      console.error('Failed to detect active station:', error)
      setActiveStationId(null)
      setHasExternalConfig(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const currentMode = await window.electronAPI.getAppMode()
      modeRef.current = currentMode
      setMode(currentMode)
      const data = await refreshStations()
      await detectActiveStation(data, currentMode)
    }

    init()

    window.electronAPI.onStationApplied(async ({ stationId }) => {
      const data = await refreshStations()
      await detectActiveStation(data)
      setActiveStationId(stationId)
    })

    window.electronAPI.onAppModeChanged(async (nextMode: AppMode) => {
      modeRef.current = nextMode
      setMode(nextMode)
      const data = await refreshStations()
      await detectActiveStation(data, nextMode)
    })

    const handleFocus = () => {
      detectActiveStation()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const handleModeChange = async (next: AppMode) => {
    if (next === modeRef.current) return
    modeRef.current = next
    setMode(next)
    await window.electronAPI.setAppMode(next)
    const data = await refreshStations()
    await detectActiveStation(data, next)
  }

  const handleAddStation = () => {
    setDialogMode(modeRef.current)
    setEditingStation(null)
    setShowStationDialog(true)
  }

  const handleEditStation = (station: TransferStation) => {
    setDialogMode(modeRef.current)
    setEditingStation(station)
    setShowStationDialog(true)
  }

  const handleDeleteStation = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await window.electronAPI.deleteStation(modeRef.current, id)
    const data = await refreshStations()
    await detectActiveStation(data)
  }

  const handleApplyStation = async (id: string) => {
    const station = stationsRef.current.find(s => s.id === id)
    if (!station) return

    if (!confirm(
      `${t('applyConfirm')} "${station.name}"?\n\n` +
      `⚠️ ${t('applyWarning')}`
    )) {
      return
    }

    const result = await window.electronAPI.applyStation(modeRef.current, id)

    if (result.success) {
      const isRunning = await window.electronAPI.isTargetRunning(modeRef.current)
      const stationName = station.name || 'Station'
      const targetName = modeRef.current === 'claude' ? 'Claude Code' : 'Codex'

      // 配置已修改,始终提示需要重启才能生效
      // 如果检测到进程正在运行,额外强调需要重启
      if (isRunning) {
        window.electronAPI.showNotification(
          t('applySuccess'),
          `${stationName}\n⚠️ ${targetName} 正在运行,请重启以使配置生效`
        )
      } else {
        window.electronAPI.showNotification(
          t('applySuccess'),
          `${stationName}\n💡 下次启动 ${targetName} 时配置将生效`
        )
      }

      await refreshStations()
      await detectActiveStation()
    } else {
      window.electronAPI.showNotification(
        t('applyFailed'),
        result.error || 'Unknown error'
      )
    }
  }

  const handleSaveStation = async (stationInput: Omit<TransferStation, 'id' | 'createdAt'>) => {
    if (editingStation) {
      await window.electronAPI.updateStation(dialogMode, editingStation.id, stationInput as Partial<TransferStation>)
    } else {
      await window.electronAPI.addStation(dialogMode, stationInput as Omit<TransferStation, 'id' | 'createdAt'>)
    }
    setShowStationDialog(false)
    setEditingStation(null)
    const data = await refreshStations()
    await detectActiveStation(data)
  }

  const handleSetBalance = (station: TransferStation) => {
    setBalanceMode(modeRef.current)
    setBalanceStation(station)
    setShowBalanceDialog(true)
  }

  const handleSaveBalance = async (balance: number, currency: Currency) => {
    if (!balanceStation) return

    await window.electronAPI.updateStation(balanceMode, balanceStation.id, {
      balance,
      currency,
      balanceLastUpdated: Date.now()
    })

    setShowBalanceDialog(false)
    setBalanceStation(null)
    const data = await refreshStations()
    await detectActiveStation(data)
  }


  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <AppIcon size={32} />
            <span className="app-version">v1.2.5</span>
          </div>
          <div className="header-title">
            <div className="title-row">
              <h1>{t('appTitle')}</h1>
              <div className="mode-switch" title={t('switchMode')}>
                {MODES.map(modeKey => (
                  <button
                    key={modeKey}
                    type="button"
                    className={`btn-icon-header mode-option ${mode === modeKey ? 'active' : ''}`}
                    onClick={() => handleModeChange(modeKey)}
                  >
                    {modeKey === 'claude' ? 'CC' : 'Codex'}
                  </button>
                ))}
              </div>
            </div>
            <div className="subtitle-row">
              <p className="subtitle-text">{t('appSubtitle')}</p>
              <div className="header-actions">
                <button onClick={toggleTheme} className="btn-icon-header" title={theme === 'light' ? t('darkMode') : t('lightMode')}>
                  {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
                </button>
                <button onClick={toggleLanguage} className="btn-icon-header" title={t('switchLanguage')}>
                  <GlobeIcon size={18} />
                </button>
                <button onClick={() => setShowBaseConfigDialog(true)} className="btn-icon-header" title={t('baseConfig')}>
                  <WrenchIcon size={18} />
                </button>
                <button onClick={handleAddStation} className="btn-icon-header btn-primary" title={t('addStation')}>
                  <PlusIcon size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {hasExternalConfig && (
          <div className="external-config-warning">
            <span className="warning-icon">⚠️</span>
            <div className="warning-content">
              <strong>{t(mode === 'codex' ? 'unknownConfigCodex' : 'unknownConfigClaude')}</strong>
              <p>{t(mode === 'codex' ? 'externalConfigHintCodex' : 'externalConfigHintClaude')}</p>
            </div>
          </div>
        )}
        {loading ? (
          <div className="loading">{t('loading')}</div>
        ) : stations.length === 0 ? (
          <div className="empty-state">
            <h2>{t('noStations')}</h2>
            <p>{t('clickToStart')}</p>
          </div>
        ) : (
          <StationList
            mode={mode}
            stations={stations}
            activeStationId={activeStationId}
            onEdit={handleEditStation}
            onDelete={handleDeleteStation}
            onApply={handleApplyStation}
            onSetBalance={handleSetBalance}
          />
        )}
      </main>

      {showStationDialog && (
        <StationDialog
          mode={dialogMode}
          station={editingStation}
          onSave={handleSaveStation}
          onClose={() => {
            setShowStationDialog(false)
            setEditingStation(null)
          }}
        />
      )}

      {showBaseConfigDialog && (
        <BaseConfigDialog
          mode={mode}
          onClose={() => setShowBaseConfigDialog(false)}
        />
      )}

      {showBalanceDialog && balanceStation && (
        <BalanceDialog
          mode={balanceMode}
          station={balanceStation}
          onSave={handleSaveBalance}
          onClose={() => {
            setShowBalanceDialog(false)
            setBalanceStation(null)
          }}
        />
      )}
    </div>
  )
}

export default App
