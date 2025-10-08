import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, nativeTheme, Notification } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { configManager } from './services/configManager.js'
import { settingsWriter } from './services/settingsWriter.js'
import { TransferStation, BaseConfig } from './types/config.js'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let currentLanguage: 'en' | 'zh' = 'en' // Track current language

const isDev = process.env.NODE_ENV === 'development'

// Disable security warnings in development
if (isDev) {
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,  // Use minimum width as default
    height: 500, // Use minimum height as default
    minWidth: 380,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Set Content Security Policy for development
      ...(isDev && {
        additionalArguments: ['--disable-features=OutOfBlinkCors']
      })
    },
    titleBarStyle: 'hiddenInset',
    show: false
  })

  // Set CSP headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': isDev
          ? ["default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; img-src 'self' data: https: http:"]
          : ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:"]
      }
    })
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Hide window instead of closing on macOS
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !app.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createApplicationMenu() {
  const isChinese = currentLanguage === 'zh'

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        {
          label: isChinese ? `关于 ${app.name}` : `About ${app.name}`,
          role: 'about'
        },
        { type: 'separator' },
        {
          label: isChinese ? '隐藏窗口' : 'Hide Window',
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow?.hide()
        },
        { type: 'separator' },
        {
          label: isChinese ? '退出' : 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true
            app.quit()
          }
        }
      ]
    },
    {
      label: isChinese ? '编辑' : 'Edit',
      submenu: [
        { label: isChinese ? '撤销' : 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: isChinese ? '重做' : 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: isChinese ? '剪切' : 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: isChinese ? '复制' : 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: isChinese ? '粘贴' : 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: isChinese ? '全选' : 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createTray() {
  try {
    // Use same icon style as app icon
    const icon = nativeImage.createEmpty()

    tray = new Tray(icon)
    tray.setTitle('CCB') // CCB = CC Bridge
    updateTrayMenu()
    tray.setToolTip('CC Bridge')

    // Click to toggle window
    tray.on('click', () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow?.show()
      }
    })

    tray.on('right-click', () => {
      tray?.popUpContextMenu()
    })
  } catch (error) {
    console.error('[Tray] Failed to create tray icon:', error)
  }
}

function updateTrayMenu() {
  const stations = configManager.getStations()

  // Use current language setting instead of system locale
  const isChinese = currentLanguage === 'zh'

  // Translations
  const t = {
    showWindow: isChinese ? '显示窗口' : 'Show Window',
    quit: isChinese ? '退出' : 'Quit',
    noStations: isChinese ? '暂无站点' : 'No Stations',
    unknownConfig: isChinese ? '未知配置（外部配置）' : 'Unknown Configuration (External)',
    applySuccess: isChinese ? '配置已应用' : 'Configuration Applied',
    applyFailed: isChinese ? '应用失败' : 'Apply Failed'
  }

  // Get current active station by reading settings file
  let currentStationId: string | null = null
  let hasExternalConfig = false

  try {
    const settings = settingsWriter.getCurrentSettingsSync()
    if (settings?.env?.ANTHROPIC_BASE_URL && settings?.env?.ANTHROPIC_AUTH_TOKEN) {
      const currentUrl = settings.env.ANTHROPIC_BASE_URL
      const currentToken = settings.env.ANTHROPIC_AUTH_TOKEN

      // Match both URL and token to ensure accurate detection
      // Skip stations with empty/failed decryption tokens
      const matchedStation = stations.find(s =>
        s.authToken && s.baseUrl === currentUrl && s.authToken === currentToken
      )

      if (matchedStation) {
        currentStationId = matchedStation.id
      } else {
        // Check if URL matches any station (token decryption may have failed)
        const urlMatch = stations.find(s => s.baseUrl === currentUrl)
        if (urlMatch) {
          // URL matches but token doesn't - likely decryption issue, treat as matched
          currentStationId = urlMatch.id
        } else {
          // Has config but not in our list = external config
          hasExternalConfig = true
        }
      }
    }
  } catch (error) {
    // If can't read settings, no station is active
    currentStationId = null
  }

  // Sort stations: active first, then by last used, then by created date
  const sortedStations = [...stations].sort((a, b) => {
    // Active station always on top
    if (a.id === currentStationId) return -1
    if (b.id === currentStationId) return 1

    // Then by last used
    if (a.lastUsed && b.lastUsed) return b.lastUsed - a.lastUsed
    if (a.lastUsed) return -1
    if (b.lastUsed) return 1

    // Finally by created date
    return b.createdAt - a.createdAt
  })

  const stationMenuItems = sortedStations.length > 0
    ? sortedStations.map(station => ({
        label: `${station.name}${station.id === currentStationId ? ' ✓' : ''}`,
        type: 'normal' as const,
        click: async () => {
          try {
            const baseConfig = configManager.getBaseConfig()
            const result = await settingsWriter.applyStation(station, baseConfig)

            if (result.success) {
              // Update last used timestamp
              configManager.updateStation(station.id, { lastUsed: Date.now() })

              // Notify renderer to update UI
              if (mainWindow) {
                mainWindow.webContents.send('station-applied', station.id)
              }

              // Update menu to show new active station
              updateTrayMenu()

              // Check if Claude Code is running
              const isRunning = await settingsWriter.isClaudeRunning()

              // Success notification with restart hint if needed
              new Notification({
                title: isChinese ? '配置已应用' : 'Configuration Applied',
                body: isRunning
                  ? `${station.name} - ${isChinese ? 'Claude Code 正在运行中，请重启以应用新配置' : 'Claude Code is running, please restart to apply new configuration'}`
                  : station.name
              }).show()
            } else {
              new Notification({
                title: t.applyFailed,
                body: result.error || 'Unknown error'
              }).show()
            }
          } catch (error: any) {
            new Notification({
              title: t.applyFailed,
              body: error.message
            }).show()
          }
        }
      }))
    : [{
        label: t.noStations,
        enabled: false
      }]

  const contextMenu = Menu.buildFromTemplate([
    // Show external config indicator if present
    ...(hasExternalConfig ? [{
      label: `⚠️ ${t.unknownConfig}`,
      enabled: false
    }, { type: 'separator' as const }] : []),
    ...stationMenuItems,
    { type: 'separator' },
    {
      label: t.showWindow,
      click: () => mainWindow?.show()
    },
    { type: 'separator' },
    {
      label: t.quit,
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray?.setContextMenu(contextMenu)
}

app.whenReady().then(() => {
  // Initialize language from system locale
  const systemLocale = app.getLocale()
  currentLanguage = systemLocale.toLowerCase().startsWith('zh') ? 'zh' : 'en'

  createApplicationMenu()
  createWindow()
  createTray()
  setupIPC()

  // Listen for system theme changes
  nativeTheme.on('updated', () => {
    const isDarkMode = nativeTheme.shouldUseDarkColors
    console.log('[System] Theme changed to:', isDarkMode ? 'dark' : 'light')

    // Notify renderer process
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system-theme-changed', isDarkMode)
    }
  })

  // Test notification on startup (development only)
  if (isDev) {
    setTimeout(() => {
      console.log('[Dev] Sending test notification...')
      if (Notification.isSupported()) {
        new Notification({
          title: 'CC Bridge',
          body: 'Notification system is working!'
        }).show()
      } else {
        console.error('[Dev] Notifications not supported')
      }
    }, 2000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  // Keep app running in tray on macOS
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
})

/**
 * Setup IPC handlers
 */
function setupIPC() {
  // Station management
  ipcMain.handle('get-stations', () => {
    return configManager.getStations()
  })

  ipcMain.handle('get-station', (_event, id: string) => {
    return configManager.getStation(id)
  })

  ipcMain.handle('add-station', (_event, station: Omit<TransferStation, 'id' | 'createdAt'>) => {
    const result = configManager.addStation(station)
    updateTrayMenu() // Update tray menu when stations change
    return result
  })

  ipcMain.handle('update-station', (_event, id: string, updates: Partial<TransferStation>) => {
    const result = configManager.updateStation(id, updates)
    updateTrayMenu() // Update tray menu when stations change
    return result
  })

  ipcMain.handle('delete-station', (_event, id: string) => {
    const result = configManager.deleteStation(id)
    updateTrayMenu() // Update tray menu when stations change
    return result
  })

  // Base config
  ipcMain.handle('get-base-config', () => {
    return configManager.getBaseConfig()
  })

  ipcMain.handle('update-base-config', (_event, config: BaseConfig) => {
    configManager.updateBaseConfig(config)
    return true
  })

  // Settings writer
  ipcMain.handle('apply-station', async (_event, stationId: string) => {
    const station = configManager.getStation(stationId)
    if (!station) {
      return { success: false, error: 'Station not found' }
    }

    const baseConfig = configManager.getBaseConfig()
    const result = await settingsWriter.applyStation(station, baseConfig)

    // Update last used timestamp and tray menu
    if (result.success) {
      configManager.updateStation(stationId, { lastUsed: Date.now() })
      updateTrayMenu() // Update tray to show new active station
    }

    return result
  })

  ipcMain.handle('is-claude-running', async () => {
    return await settingsWriter.isClaudeRunning()
  })

  ipcMain.handle('get-current-settings', async () => {
    return await settingsWriter.getCurrentSettings()
  })

  // Utility
  ipcMain.handle('get-store-path', () => {
    return configManager.getStorePath()
  })

  ipcMain.handle('get-settings-path', () => {
    return settingsWriter.getSettingsPath()
  })

  // System preferences
  ipcMain.handle('get-system-preferences', () => {
    const systemLocale = app.getLocale() // e.g., 'zh-CN', 'en-US'
    const isDarkMode = nativeTheme.shouldUseDarkColors

    return {
      locale: systemLocale,
      isDarkMode: isDarkMode
    }
  })

  // Window management
  ipcMain.on('hide-window', () => {
    mainWindow?.hide()
  })

  // Listen for station-applied notifications
  ipcMain.on('station-applied', (_event, stationId: string) => {
    if (mainWindow) {
      mainWindow.webContents.send('station-applied', stationId)
    }
  })

  // Listen for language changes
  ipcMain.on('language-changed', (_event, language: 'en' | 'zh') => {
    currentLanguage = language
    createApplicationMenu() // Update application menu with new language
    updateTrayMenu() // Update tray menu with new language
  })

  // Show notification
  ipcMain.on('show-notification', (_event, title: string, body: string) => {
    console.log('[Notification] Attempting to show:', { title, body })

    if (!Notification.isSupported()) {
      console.error('[Notification] Notifications are not supported on this system')
      return
    }

    try {
      const notification = new Notification({
        title,
        body
      })

      notification.on('show', () => {
        console.log('[Notification] Notification shown successfully')
      })

      notification.on('failed', (_, error) => {
        console.error('[Notification] Failed to show notification:', error)
      })

      notification.show()
    } catch (error) {
      console.error('[Notification] Error creating notification:', error)
    }
  })
}
