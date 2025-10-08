import { TransferStation, BaseConfig } from './types/config'

declare global {
  interface Window {
    electronAPI: {
      // Station management
      getStations: () => Promise<TransferStation[]>
      getStation: (id: string) => Promise<TransferStation | undefined>
      addStation: (station: Omit<TransferStation, 'id' | 'createdAt'>) => Promise<TransferStation>
      updateStation: (id: string, updates: Partial<TransferStation>) => Promise<boolean>
      deleteStation: (id: string) => Promise<boolean>

      // Base config
      getBaseConfig: () => Promise<BaseConfig>
      updateBaseConfig: (config: BaseConfig) => Promise<boolean>

      // Settings writer
      applyStation: (stationId: string) => Promise<{
        success: boolean
        backupPath?: string
        error?: string
      }>
      isClaudeRunning: () => Promise<boolean>
      getCurrentSettings: () => Promise<any>

      // Utility
      getStorePath: () => Promise<string>
      getSettingsPath: () => Promise<string>
      getSystemPreferences: () => Promise<{ locale: string; isDarkMode: boolean }>
      hideWindow: () => void
      notifyLanguageChange: (language: 'en' | 'zh') => void
      showNotification: (title: string, body: string) => void
      shell: {
        openExternal: (url: string) => Promise<void>
      }

      // Auto updater
      onUpdateAvailable: (callback: () => void) => void
      onUpdateDownloaded: (callback: () => void) => void
      onStationApplied: (callback: (stationId: string) => void) => void

      // System changes listeners
      onSystemThemeChanged: (callback: (isDarkMode: boolean) => void) => void
    }
  }
}

export {}
