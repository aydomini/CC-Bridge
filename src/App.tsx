import { useState, useEffect } from 'react'
import { TransferStation, Currency } from './types/config'
import StationList from './components/StationList'
import StationDialog from './components/StationDialog'
import BaseConfigDialog from './components/BaseConfigDialog'
import BalanceDialog from './components/BalanceDialog'
import AppIcon from './components/AppIcon'
import { MoonIcon, SunIcon, GlobeIcon, WrenchIcon, PlusIcon, MinimizeIcon } from './components/Icons'
import { useTheme } from './contexts/ThemeContext'
import { useLanguage } from './contexts/LanguageContext'
import './App.css'

function App() {
  const { theme, toggleTheme } = useTheme()
  const { toggleLanguage, t } = useLanguage()
  const [stations, setStations] = useState<TransferStation[]>([])
  const [showStationDialog, setShowStationDialog] = useState(false)
  const [showBaseConfigDialog, setShowBaseConfigDialog] = useState(false)
  const [showBalanceDialog, setShowBalanceDialog] = useState(false)
  const [editingStation, setEditingStation] = useState<TransferStation | null>(null)
  const [balanceStation, setBalanceStation] = useState<TransferStation | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeStationId, setActiveStationId] = useState<string | null>(null)
  const [hasExternalConfig, setHasExternalConfig] = useState(false)

  useEffect(() => {
    loadStations()
    detectActiveStation()

    // Listen for station-applied events from tray
    window.electronAPI.onStationApplied((stationId: string) => {
      setActiveStationId(stationId)
      loadStations() // Reload to update lastUsed
    })

    // Re-detect active station when window gains focus
    const handleFocus = () => {
      detectActiveStation()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const detectActiveStation = async () => {
    try {
      const settings = await window.electronAPI.getCurrentSettings()
      if (settings?.env?.ANTHROPIC_BASE_URL && settings?.env?.ANTHROPIC_AUTH_TOKEN) {
        const allStations = await window.electronAPI.getStations()
        const matched = allStations.find(s =>
          s.baseUrl === settings.env.ANTHROPIC_BASE_URL &&
          s.authToken === settings.env.ANTHROPIC_AUTH_TOKEN
        )

        if (matched) {
          setActiveStationId(matched.id)
          setHasExternalConfig(false)
        } else {
          // Has config but not in our list = external config
          setActiveStationId(null)
          setHasExternalConfig(true)
        }
      } else {
        setActiveStationId(null)
        setHasExternalConfig(false)
      }
    } catch (error) {
      setActiveStationId(null)
      setHasExternalConfig(false)
    }
  }

  const loadStations = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getStations()
      setStations(data)
    } catch (error) {
      console.error('Failed to load stations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStation = () => {
    setEditingStation(null)
    setShowStationDialog(true)
  }

  const handleEditStation = (station: TransferStation) => {
    setEditingStation(station)
    setShowStationDialog(true)
  }

  const handleDeleteStation = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return

    const success = await window.electronAPI.deleteStation(id)
    if (success) {
      loadStations()
      // Re-detect if we deleted the active station
      if (id === activeStationId) {
        detectActiveStation()
      }
    }
  }

  const handleApplyStation = async (id: string) => {
    const station = stations.find(s => s.id === id)
    if (!station) return

    if (!confirm(
      `${t('applyConfirm')} "${station.name}"?\n\n` +
      `⚠️ ${t('applyWarning')}`
    )) {
      return
    }

    const result = await window.electronAPI.applyStation(id)
    console.log('[App] Apply station result:', result)

    if (result.success) {
      const isRunning = await window.electronAPI.isClaudeRunning()

      const station = stations.find(s => s.id === id)
      const stationName = station?.name || 'Station'

      console.log('[App] Sending notification:', { isRunning, stationName })

      if (isRunning) {
        window.electronAPI.showNotification(
          t('applySuccess'),
          `${stationName} - ${t('needRestartCC')}`
        )
      } else {
        window.electronAPI.showNotification(
          t('applySuccess'),
          stationName
        )
      }

      setActiveStationId(id) // Mark as active
      setHasExternalConfig(false) // Clear external config flag
      loadStations() // Refresh to update lastUsed
    } else {
      window.electronAPI.showNotification(
        t('applyFailed'),
        result.error || 'Unknown error'
      )
    }
  }

  const handleSaveStation = async (station: Omit<TransferStation, 'id' | 'createdAt'>) => {
    if (editingStation) {
      await window.electronAPI.updateStation(editingStation.id, station)
      // Re-detect if we edited the active station (URL or token might have changed)
      if (editingStation.id === activeStationId) {
        detectActiveStation()
      }
    } else {
      await window.electronAPI.addStation(station)
    }
    setShowStationDialog(false)
    loadStations()
  }

  const handleSetBalance = (station: TransferStation) => {
    setBalanceStation(station)
    setShowBalanceDialog(true)
  }

  const handleSaveBalance = async (balance: number, currency: Currency) => {
    if (!balanceStation) return

    await window.electronAPI.updateStation(balanceStation.id, {
      balance,
      currency,
      balanceLastUpdated: Date.now()
    })

    setShowBalanceDialog(false)
    setBalanceStation(null)
    loadStations()
  }

  const handleHideToTray = () => {
    window.electronAPI?.hideWindow?.()
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <AppIcon size={32} />
            <span className="app-version">v1.0.0</span>
          </div>
          <div className="header-title">
            <h1>{t('appTitle')}</h1>
            <p>{t('appSubtitle')}</p>
          </div>
        </div>
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
          <button onClick={handleHideToTray} className="btn-icon-header" title={t('hideToTray')}>
            <MinimizeIcon size={18} />
          </button>
        </div>
      </header>

      <main className="app-main">
        {hasExternalConfig && (
          <div className="external-config-warning">
            <span className="warning-icon">⚠️</span>
            <div className="warning-content">
              <strong>{t('unknownConfig')}</strong>
              <p>{t('externalConfigHint')}</p>
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
          station={editingStation}
          onSave={handleSaveStation}
          onClose={() => setShowStationDialog(false)}
        />
      )}

      {showBaseConfigDialog && (
        <BaseConfigDialog
          onClose={() => setShowBaseConfigDialog(false)}
        />
      )}

      {showBalanceDialog && balanceStation && (
        <BalanceDialog
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
