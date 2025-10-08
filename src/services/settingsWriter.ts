import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { TransferStation, BaseConfig, ClaudeSettings } from '../types/config'

const execAsync = promisify(exec)

/**
 * Service for writing Claude Code settings.json
 */
class SettingsWriter {
  private settingsPath: string

  constructor() {
    this.settingsPath = path.join(os.homedir(), '.claude', 'settings.json')
  }

  /**
   * Check if Claude Code process is running
   */
  async isClaudeRunning(): Promise<boolean> {
    try {
      if (process.platform === 'darwin' || process.platform === 'linux') {
        const { stdout } = await execAsync('ps aux | grep -i claude | grep -v grep')
        return stdout.trim().length > 0
      } else if (process.platform === 'win32') {
        const { stdout } = await execAsync('tasklist | findstr /i claude')
        return stdout.trim().length > 0
      }
      return false
    } catch (error) {
      // If grep/findstr returns no results, it throws an error
      return false
    }
  }

  /**
   * Generate final settings.json from station and base config
   */
  generateSettings(station: TransferStation, baseConfig: BaseConfig): ClaudeSettings {
    // Start with base config
    const settings: ClaudeSettings = {
      env: {
        ANTHROPIC_AUTH_TOKEN: station.authToken,
        ANTHROPIC_BASE_URL: station.baseUrl,
        ...baseConfig.env
      },
      permissions: { ...baseConfig.permissions }
    }

    // Apply custom config if exists
    if (station.customConfig) {
      if (station.customConfig.env) {
        Object.assign(settings.env, station.customConfig.env)
      }
      if (station.customConfig.permissions) {
        settings.permissions = {
          allow: station.customConfig.permissions.allow ?? settings.permissions.allow,
          deny: station.customConfig.permissions.deny ?? settings.permissions.deny
        }
      }
    }

    return settings
  }

  /**
   * Create backup of existing settings
   */
  async backupSettings(): Promise<string | null> {
    try {
      const exists = await this.fileExists(this.settingsPath)
      if (!exists) return null

      const backupPath = `${this.settingsPath}.backup.${Date.now()}`
      await fs.copyFile(this.settingsPath, backupPath)
      return backupPath
    } catch (error) {
      console.error('Failed to backup settings:', error)
      return null
    }
  }

  /**
   * Write settings to file
   */
  async writeSettings(settings: ClaudeSettings): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.settingsPath)
    await fs.mkdir(dir, { recursive: true })

    // Write file
    const content = JSON.stringify(settings, null, 2)
    await fs.writeFile(this.settingsPath, content, 'utf-8')

    // Verify
    const verification = JSON.parse(await fs.readFile(this.settingsPath, 'utf-8'))
    if (!verification.env?.ANTHROPIC_AUTH_TOKEN) {
      throw new Error('Settings verification failed')
    }
  }

  /**
   * Apply station configuration to local settings
   */
  async applyStation(station: TransferStation, baseConfig: BaseConfig): Promise<{
    success: boolean
    backupPath?: string
    error?: string
  }> {
    try {
      // Check if Claude is running
      const isRunning = await this.isClaudeRunning()
      if (isRunning) {
        return {
          success: false,
          error: 'Claude Code is currently running. Please close it before applying configuration.'
        }
      }

      // Backup existing settings
      const backupPath = await this.backupSettings()

      // Generate and write settings
      const settings = this.generateSettings(station, baseConfig)
      await this.writeSettings(settings)

      return {
        success: true,
        backupPath: backupPath ?? undefined
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get current settings
   */
  async getCurrentSettings(): Promise<ClaudeSettings | null> {
    try {
      const exists = await this.fileExists(this.settingsPath)
      if (!exists) return null

      const content = await fs.readFile(this.settingsPath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('Failed to read settings:', error)
      return null
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get settings file path
   */
  getSettingsPath(): string {
    return this.settingsPath
  }
}

export const settingsWriter = new SettingsWriter()
