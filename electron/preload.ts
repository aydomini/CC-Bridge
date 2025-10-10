import { contextBridge, ipcRenderer, shell } from 'electron'
import {
  TransferStation,
  ClaudeBaseConfig,
  CodexBaseConfig,
  AppMode,
  ActiveSettings
} from './types/config.js'

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Station management
  getStations: (mode?: AppMode) => ipcRenderer.invoke('get-stations', mode),
  getStationsByMode: () => ipcRenderer.invoke('get-all-stations'),
  getStation: (mode: AppMode, id: string) => ipcRenderer.invoke('get-station', mode, id),
  addStation: (mode: AppMode, station: Omit<TransferStation, 'id' | 'createdAt'>) =>
    ipcRenderer.invoke('add-station', mode, station),
  updateStation: (mode: AppMode, id: string, updates: Partial<TransferStation>) =>
    ipcRenderer.invoke('update-station', mode, id, updates),
  deleteStation: (mode: AppMode, id: string) => ipcRenderer.invoke('delete-station', mode, id),

  // Base config
  getBaseConfig: (mode?: AppMode) => ipcRenderer.invoke('get-base-config', mode),
  updateBaseConfig: (mode: AppMode, config: ClaudeBaseConfig | CodexBaseConfig) =>
    ipcRenderer.invoke('update-base-config', mode, config),
  getActiveStationId: (mode?: AppMode) => ipcRenderer.invoke('get-active-station-id', mode),
  getActiveStationIds: () => ipcRenderer.invoke('get-active-station-ids'),

  // Settings writer
  applyStation: (mode: AppMode, stationId: string) => ipcRenderer.invoke('apply-station', mode, stationId),
  isTargetRunning: (mode?: AppMode) => ipcRenderer.invoke('is-target-running', mode),
  getCurrentSettings: (mode?: AppMode): Promise<ActiveSettings | null> =>
    ipcRenderer.invoke('get-current-settings', mode),
  getCurrentSettingsAll: (): Promise<Record<AppMode, ActiveSettings | null>> =>
    ipcRenderer.invoke('get-current-settings-all'),

  // Utility
  getStorePath: () => ipcRenderer.invoke('get-store-path'),
  getSettingsPath: (mode?: AppMode) => ipcRenderer.invoke('get-settings-path', mode),
  getSystemPreferences: () => ipcRenderer.invoke('get-system-preferences'),
  hideWindow: () => ipcRenderer.send('hide-window'),
  notifyLanguageChange: (language: 'en' | 'zh') => ipcRenderer.send('language-changed', language),
  showNotification: (title: string, body: string) => ipcRenderer.send('show-notification', title, body),

  // Project config files
  getProjectConfig: (mode: AppMode) => ipcRenderer.invoke('get-project-config', mode),
  updateProjectConfig: (mode: AppMode, content: string) =>
    ipcRenderer.invoke('update-project-config', mode, content),

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
  onStationApplied: (callback: (payload: { stationId: string; mode: AppMode }) => void) => {
    ipcRenderer.on('station-applied', (_event, payload) => callback(payload))
  },

  // Mode management
  getAppMode: (): Promise<AppMode> => ipcRenderer.invoke('get-app-mode'),
  setAppMode: (mode: AppMode) => ipcRenderer.invoke('set-app-mode', mode),
  onAppModeChanged: (callback: (mode: AppMode) => void) => {
    ipcRenderer.on('app-mode-changed', (_event, mode) => callback(mode))
  }
})
