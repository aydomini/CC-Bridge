import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, nativeTheme, Notification } from 'electron'
import path from 'path'
import { configManager } from './services/configManager.js'
import { settingsWriter } from './services/settingsWriter.js'
import { AppMode, TransferStation, ClaudeBaseConfig, CodexBaseConfig } from './types/config.js'
// Persistent storage managed by configManager

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
  if (!tray) return

  const isChinese = currentLanguage === 'zh'
  const activeMode = configManager.getActiveMode()

  const modeNames: Record<AppMode, string> = {
    claude: isChinese ? 'Claude Code' : 'Claude Code',
    codex: 'Codex'
  }

  const sectionLabels: Record<AppMode, string> = {
    claude: isChinese ? 'Claude Code 站点' : 'Claude Code Stations',
    codex: isChinese ? 'Codex 站点' : 'Codex Stations'
  }

  const externalWarnings: Record<AppMode, string> = {
    claude: isChinese ? '当前 Claude Code 配置不受本应用管理' : 'Claude configuration outside this app',
    codex: isChinese ? '当前 Codex 配置不受本应用管理' : 'Codex configuration outside this app'
  }

  const modeHeader = isChinese
    ? `当前模式：${modeNames[activeMode]}`
    : `Mode: ${modeNames[activeMode]}`

  const activeSuffix = isChinese ? '（当前模式）' : ' (Active Mode)'
  const noStationsText = isChinese ? '暂无站点' : 'No Stations'
  const showWindowText = isChinese ? '显示窗口' : 'Show Window'
  const quitText = isChinese ? '退出' : 'Quit'
  const applySuccessText = isChinese ? '配置已应用' : 'Configuration Applied'
  const applyFailedText = isChinese ? '应用失败' : 'Apply Failed'
  const claudeRestartHint = isChinese
    ? 'Claude Code 正在运行中，请重启以应用新配置'
    : 'Claude Code is running, please restart to apply new configuration'

  const modes: AppMode[] = ['claude', 'codex']

  const buildSection = (mode: AppMode): Electron.MenuItemConstructorOptions => {
    const stations = configManager.getStations(mode)
    const storedActiveId = configManager.getActiveStationId(mode)
    let currentStationId: string | null = storedActiveId ?? null
    let hasExternalConfig = false

    const settingsSnapshot = settingsWriter.getCurrentSettingsSync(mode)
    if (settingsSnapshot && settingsSnapshot.mode === mode) {
      if (mode === 'claude') {
        const settings = settingsSnapshot.settings
        const currentUrl = settings.env?.ANTHROPIC_BASE_URL
        const currentToken = settings.env?.ANTHROPIC_AUTH_TOKEN
        if (currentUrl && currentToken) {
          const matched = stations.find(
            s => s.baseUrl === currentUrl && s.authToken === currentToken
          )
          if (matched) {
            currentStationId = matched.id
          } else {
            const urlMatch = stations.find(s => s.baseUrl === currentUrl)
            if (urlMatch) {
              currentStationId = urlMatch.id
            } else {
              hasExternalConfig = true
              currentStationId = null
            }
          }
        }
      } else {
        const settings = settingsSnapshot.settings
        const currentUrl = settings.baseUrl
        const currentToken = settings.authToken
        if (currentUrl && currentToken) {
          const matched = stations.find(
            s => s.baseUrl === currentUrl && s.authToken === currentToken
          )
          if (matched) {
            currentStationId = matched.id
          } else {
            const urlMatch = stations.find(s => s.baseUrl === currentUrl)
            if (urlMatch) {
              currentStationId = urlMatch.id
            } else {
              hasExternalConfig = true
              currentStationId = null
            }
          }
        }
      }
    } else if (settingsSnapshot) {
      hasExternalConfig = true
    }

    if (!settingsSnapshot && storedActiveId) {
      currentStationId = storedActiveId
    }

    if ((currentStationId ?? null) !== (storedActiveId ?? null)) {
      configManager.setActiveStationId(mode, currentStationId)
    }

    const sortedStations = [...stations].sort((a, b) => {
      if (a.id === currentStationId) return -1
      if (b.id === currentStationId) return 1

      if (a.lastUsed && b.lastUsed) return b.lastUsed - a.lastUsed
      if (a.lastUsed) return -1
      if (b.lastUsed) return 1

      return b.createdAt - a.createdAt
    })

    const stationMenuItems: Electron.MenuItemConstructorOptions[] = sortedStations.length > 0
      ? sortedStations.map(station => ({
          label: `${station.name}${station.id === currentStationId ? ' ✓' : ''}`,
          type: 'normal' as const,
          click: async () => {
            try {
              const baseConfig = configManager.getBaseConfig(mode)
              const result = await settingsWriter.applyStation(station, baseConfig, mode)

              if (result.success) {
                configManager.updateStation(station.id, { lastUsed: Date.now() }, mode)
                configManager.setActiveStationId(mode, station.id)

                if (configManager.getActiveMode() !== mode) {
                  configManager.setActiveMode(mode)
                  if (mainWindow) {
                    mainWindow.webContents.send('app-mode-changed', mode)
                  }
                }

                if (mainWindow) {
                  mainWindow.webContents.send('station-applied', { stationId: station.id, mode })
                }

                updateTrayMenu()

                const isRunning = await settingsWriter.isTargetRunning(mode)
                const body = mode === 'claude' && isRunning
                  ? `${station.name} - ${claudeRestartHint}`
                  : station.name

                new Notification({
                  title: applySuccessText,
                  body
                }).show()
              } else {
                new Notification({
                  title: applyFailedText,
                  body: result.error || 'Unknown error'
                }).show()
              }
            } catch (error: any) {
              new Notification({
                title: applyFailedText,
                body: error.message
              }).show()
            }
          }
        }))
      : [
          {
            label: noStationsText,
            enabled: false
          }
        ]

    const submenu: Electron.MenuItemConstructorOptions[] = []
    if (hasExternalConfig) {
      submenu.push({
        label: `⚠️ ${externalWarnings[mode]}`,
        enabled: false
      })
      submenu.push({ type: 'separator' })
    }
    submenu.push(...stationMenuItems)

    return {
      label: `${sectionLabels[mode]}${mode === activeMode ? activeSuffix : ''}`,
      submenu
    }
  }

  const sections = modes.map(buildSection)

  const template: Electron.MenuItemConstructorOptions[] = [
    { label: modeHeader, enabled: false },
    { type: 'separator' }
  ]

  sections.forEach((section, index) => {
    template.push(section)
    if (index < sections.length - 1) {
      template.push({ type: 'separator' })
    }
  })

  template.push({ type: 'separator' })
  template.push({
    label: showWindowText,
    click: () => mainWindow?.show()
  })
  template.push({ type: 'separator' })
  template.push({
    label: quitText,
    click: () => {
      app.isQuitting = true
      app.quit()
    }
  })

  tray.setContextMenu(Menu.buildFromTemplate(template))

  const tooltip = activeMode === 'codex'
    ? isChinese ? 'CC Bridge - Codex 模式' : 'CC Bridge - Codex Mode'
    : isChinese ? 'CC Bridge - Claude Code 模式' : 'CC Bridge - Claude Code Mode'
  tray.setToolTip(tooltip)
}

app.whenReady().then(() => {
  // Check for user's stored language preference first
  const userLanguage = configManager.getLanguage()

  // If no user preference, default to Chinese
  if (!userLanguage) {
    // 首次启动时设置为中文
    currentLanguage = 'zh'
    configManager.setLanguage('zh')
  } else {
    currentLanguage = userLanguage
  }

  createApplicationMenu()
  createWindow()
  createTray()
  setupIPC()

  // No need for runtime system theme/locale monitoring
  // Theme: checked once on startup + time-based switching (7:00/19:00)
  // Language: user preference only, no system detection

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
  ipcMain.handle('get-stations', (_event, mode?: AppMode) => {
    return configManager.getStations(mode)
  })

  ipcMain.handle('get-all-stations', () => {
    return configManager.getAllStations()
  })

  ipcMain.handle('get-station', (_event, mode: AppMode, id: string) => {
    return configManager.getStation(id, mode)
  })

  ipcMain.handle(
    'add-station',
    (_event, mode: AppMode, station: Omit<TransferStation, 'id' | 'createdAt'>) => {
      const result = configManager.addStation(station, mode)
      updateTrayMenu()
      return result
    }
  )

  ipcMain.handle(
    'update-station',
    (_event, mode: AppMode, id: string, updates: Partial<TransferStation>) => {
      const result = configManager.updateStation(id, updates, mode)
      updateTrayMenu()
      return result
    }
  )

  ipcMain.handle('delete-station', (_event, mode: AppMode, id: string) => {
    const result = configManager.deleteStation(id, mode)
    updateTrayMenu()
    return result
  })

  // Base config
  ipcMain.handle('get-base-config', (_event, mode?: AppMode) => {
    return configManager.getBaseConfig(mode)
  })

  ipcMain.handle(
    'update-base-config',
    (_event, mode: AppMode, config: ClaudeBaseConfig | CodexBaseConfig) => {
      configManager.updateBaseConfig(config, mode)
      return true
    }
  )

  ipcMain.handle('get-active-station-id', (_event, mode?: AppMode) => {
    return configManager.getActiveStationId(mode)
  })

  ipcMain.handle('get-active-station-ids', () => {
    return {
      claude: configManager.getActiveStationId('claude'),
      codex: configManager.getActiveStationId('codex')
    }
  })

  ipcMain.handle('get-app-mode', () => {
    return configManager.getActiveMode()
  })

  ipcMain.handle('set-app-mode', (_event, mode: AppMode) => {
    configManager.setActiveMode(mode)
    updateTrayMenu()
    if (mainWindow) {
      mainWindow.webContents.send('app-mode-changed', mode)
    }
    return true
  })

  // Settings writer
  ipcMain.handle('apply-station', async (_event, mode: AppMode, stationId: string) => {
    const station = configManager.getStation(stationId, mode)
    if (!station) {
      return { success: false, error: 'Station not found' }
    }

    const baseConfig = configManager.getBaseConfig(mode)
    const result = await settingsWriter.applyStation(station, baseConfig, mode)

    // Update last used timestamp and tray menu
    if (result.success) {
      configManager.updateStation(stationId, { lastUsed: Date.now() }, mode)
      configManager.setActiveStationId(mode, stationId)
      if (configManager.getActiveMode() !== mode) {
        configManager.setActiveMode(mode)
        if (mainWindow) {
          mainWindow.webContents.send('app-mode-changed', mode)
        }
      }
      updateTrayMenu() // Update tray to show new active station
      if (mainWindow) {
        mainWindow.webContents.send('station-applied', { stationId, mode })
      }
    }

    return result
  })

  ipcMain.handle('is-target-running', async (_event, mode?: AppMode) => {
    return await settingsWriter.isTargetRunning(mode ?? configManager.getActiveMode())
  })

  ipcMain.handle('get-current-settings', async (_event, mode?: AppMode) => {
    return await settingsWriter.getCurrentSettings(mode ?? configManager.getActiveMode())
  })

  ipcMain.handle('get-current-settings-all', async () => {
    return {
      claude: await settingsWriter.getCurrentSettings('claude'),
      codex: await settingsWriter.getCurrentSettings('codex')
    }
  })

  // Utility
  ipcMain.handle('get-store-path', () => {
    return configManager.getStorePath()
  })

  ipcMain.handle('get-settings-path', (_event, mode?: AppMode) => {
    return settingsWriter.getSettingsPath(mode ?? configManager.getActiveMode())
  })

  // Project config files (CLAUDE.md / AGENTS.md)
  ipcMain.handle('get-project-config', async (_event, mode: AppMode) => {
    const filePath = mode === 'codex'
      ? path.join(app.getPath('home'), '.codex', 'AGENTS.md')
      : path.join(app.getPath('home'), '.claude', 'CLAUDE.md')

    try {
      const fs = await import('fs/promises')
      const content = await fs.readFile(filePath, 'utf-8')
      return content
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return '' // File doesn't exist, return empty string
      }
      throw error
    }
  })

  ipcMain.handle('update-project-config', async (_event, mode: AppMode, content: string) => {
    const filePath = mode === 'codex'
      ? path.join(app.getPath('home'), '.codex', 'AGENTS.md')
      : path.join(app.getPath('home'), '.claude', 'CLAUDE.md')

    try {
      const fs = await import('fs/promises')
      const dir = path.dirname(filePath)

      // Ensure directory exists
      try {
        await fs.access(dir)
      } catch {
        await fs.mkdir(dir, { recursive: true })
      }

      // Backup existing file before overwriting (if it exists)
      try {
        await fs.access(filePath)
        const backupPath = `${filePath}.backup.${Date.now()}`
        await fs.copyFile(filePath, backupPath)

        // Auto cleanup old backups, keeping only the most recent 1 backup
        const fileName = path.basename(filePath)
        const files = await fs.readdir(dir)
        const backups = files
          .filter(f => f.startsWith(`${fileName}.backup.`))
          .map(f => ({
            name: f,
            timestamp: parseInt(f.split('.backup.')[1] || '0'),
            path: path.join(dir, f)
          }))
          .sort((a, b) => b.timestamp - a.timestamp)

        // Delete old backups (keep only 1 most recent)
        const toDelete = backups.slice(1)
        for (const backup of toDelete) {
          await fs.unlink(backup.path).catch(() => {})
        }
      } catch (error: any) {
        // File doesn't exist yet, no need to backup
        if (error.code !== 'ENOENT') {
          console.warn('[ProjectConfig] Failed to backup:', error)
        }
      }

      await fs.writeFile(filePath, content, 'utf-8')
      return true
    } catch (error) {
      throw error
    }
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
  ipcMain.on('station-applied', (_event, payload: { stationId: string; mode: AppMode }) => {
    if (mainWindow) {
      mainWindow.webContents.send('station-applied', payload)
    }
  })

  // Listen for language changes
  ipcMain.on('language-changed', (_event, language: 'en' | 'zh') => {
    currentLanguage = language

    // Save user's language preference
    configManager.setLanguage(language)

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
