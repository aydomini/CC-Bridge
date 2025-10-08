import { contextBridge, ipcRenderer, shell } from 'electron'
import { TransferStation, BaseConfig } from './types/config.js'

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Station management
  getStations: () => ipcRenderer.invoke('get-stations'),
  getStation: (id: string) => ipcRenderer.invoke('get-station', id),
  addStation: (station: Omit<TransferStation, 'id' | 'createdAt'>) =>
    ipcRenderer.invoke('add-station', station),
  updateStation: (id: string, updates: Partial<TransferStation>) =>
    ipcRenderer.invoke('update-station', id, updates),
  deleteStation: (id: string) => ipcRenderer.invoke('delete-station', id),

  // Base config
  getBaseConfig: () => ipcRenderer.invoke('get-base-config'),
  updateBaseConfig: (config: BaseConfig) => ipcRenderer.invoke('update-base-config', config),

  // Settings writer
  applyStation: (stationId: string) => ipcRenderer.invoke('apply-station', stationId),
  isClaudeRunning: () => ipcRenderer.invoke('is-claude-running'),
  getCurrentSettings: () => ipcRenderer.invoke('get-current-settings'),

  // Utility
  getStorePath: () => ipcRenderer.invoke('get-store-path'),
  getSettingsPath: () => ipcRenderer.invoke('get-settings-path'),
  getSystemPreferences: () => ipcRenderer.invoke('get-system-preferences'),
  hideWindow: () => ipcRenderer.send('hide-window'),
  notifyLanguageChange: (language: 'en' | 'zh') => ipcRenderer.send('language-changed', language),
  showNotification: (title: string, body: string) => ipcRenderer.send('show-notification', title, body),

  // Shell
  shell: {
    openExternal: (url: string) => shell.openExternal(url)
  },

  // Auto updater listeners
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update-available', callback)
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', callback)
  },
  onStationApplied: (callback: (stationId: string) => void) => {
    ipcRenderer.on('station-applied', (_event, stationId) => callback(stationId))
  },

  // System theme/language listeners
  onSystemThemeChanged: (callback: (isDarkMode: boolean) => void) => {
    ipcRenderer.on('system-theme-changed', (_event, isDarkMode) => callback(isDarkMode))
  }
})
