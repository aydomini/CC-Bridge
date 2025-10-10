import {
  TransferStation,
  ClaudeBaseConfig,
  CodexBaseConfig,
  BaseConfig,
  AppMode,
  ActiveSettings
} from './types/config'

declare global {
  interface Window {
    electronAPI: {
      // Station management
      getStations: (mode?: AppMode) => Promise<TransferStation[]>
      getStationsByMode: () => Promise<Record<AppMode, TransferStation[]>>
      getStation: (mode: AppMode, id: string) => Promise<TransferStation | undefined>
      addStation: (mode: AppMode, station: Omit<TransferStation, 'id' | 'createdAt'>) => Promise<TransferStation>
      updateStation: (mode: AppMode, id: string, updates: Partial<TransferStation>) => Promise<boolean>
      deleteStation: (mode: AppMode, id: string) => Promise<boolean>

      // Base config
      getBaseConfig: (mode?: AppMode) => Promise<BaseConfig | ClaudeBaseConfig | CodexBaseConfig>
      updateBaseConfig: (mode: AppMode, config: ClaudeBaseConfig | CodexBaseConfig) => Promise<boolean>
      getActiveStationId: (mode?: AppMode) => Promise<string | null>
      getActiveStationIds: () => Promise<Record<AppMode, string | null>>

      // Settings writer
      applyStation: (mode: AppMode, stationId: string) => Promise<{
        success: boolean
        backups?: { settings?: string; auth?: string }
        error?: string
      }>
      isTargetRunning: (mode?: AppMode) => Promise<boolean>
      getCurrentSettings: (mode?: AppMode) => Promise<ActiveSettings | null>
      getCurrentSettingsAll: () => Promise<Record<AppMode, ActiveSettings | null>>

      // Utility
      getStorePath: () => Promise<string>
      getSettingsPath: (mode?: AppMode) => Promise<{ settings: string; auth?: string }>
      getSystemPreferences: () => Promise<{ locale: string; isDarkMode: boolean }>
      hideWindow: () => void
      notifyLanguageChange: (language: 'en' | 'zh') => void
      showNotification: (title: string, body: string) => void

      // Project config files
      getProjectConfig: (mode: AppMode) => Promise<string>
      updateProjectConfig: (mode: AppMode, content: string) => Promise<boolean>

      shell: {
        openExternal: (url: string) => Promise<void>
      }

      // Auto updater
      onUpdateAvailable: (callback: () => void) => void
      onUpdateDownloaded: (callback: () => void) => void
      onStationApplied: (callback: (payload: { stationId: string; mode: AppMode }) => void) => void

      // Mode management
      getAppMode: () => Promise<AppMode>
      setAppMode: (mode: AppMode) => Promise<boolean>
      onAppModeChanged: (callback: (mode: AppMode) => void) => void
    }
  }
}

export {}
