import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import {
  AppMode,
  TransferStation,
  ClaudeTransferStation,
  CodexTransferStation,
  ClaudeBaseConfig,
  CodexBaseConfig,
  ClaudeSettings,
  CodexSettings,
  ActiveSettings,
  DEFAULT_CODEX_BASE_CONFIG
} from '../types/config.js'

const execAsync = promisify(exec)

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')
const CODEX_DIR = path.join(os.homedir(), '.codex')
const CODEX_CONFIG_PATH = path.join(CODEX_DIR, 'config.toml')
const CODEX_AUTH_PATH = path.join(CODEX_DIR, 'auth.json')

const KNOWN_TOP_LEVEL_KEYS = new Set([
  'model_provider',
  'model',
  'model_reasoning_effort',
  'disable_response_storage',
  'wire_api',
  'requires_openai_auth'
])

const sanitizeProviderKey = (value: string): string => {
  return (value || 'provider')
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'provider'
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const formatTomlValue = (value: string | number | boolean): string => {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return Number.isFinite(value) ? `${value}` : `"${value}"`
  return `"${value}"`
}

const mergeCodexBaseConfig = (
  base: CodexBaseConfig,
  custom?: Partial<CodexBaseConfig>
): CodexBaseConfig => ({
  modelProvider: custom?.modelProvider ?? base.modelProvider,
  model: custom?.model ?? base.model,
  modelReasoningEffort: custom?.modelReasoningEffort ?? base.modelReasoningEffort,
  disableResponseStorage: custom?.disableResponseStorage ?? base.disableResponseStorage,
  wireApi: custom?.wireApi ?? base.wireApi,
  requiresOpenaiAuth: custom?.requiresOpenaiAuth ?? base.requiresOpenaiAuth,
  additionalSettings: {
    ...(base.additionalSettings ?? {}),
    ...(custom?.additionalSettings ?? {})
  }
})

const ensureDir = async (filePath: string) => {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
}

/**
 * Clean up old backup files, keeping only the most recent N backups
 */
const cleanupOldBackups = async (filePath: string, keepCount: number = 1): Promise<void> => {
  try {
    const dir = path.dirname(filePath)
    const fileName = path.basename(filePath)

    // Find all backup files matching pattern: filename.backup.*
    const files = await fs.readdir(dir)
    const backups = files
      .filter(f => f.startsWith(`${fileName}.backup.`))
      .map(f => ({
        name: f,
        timestamp: parseInt(f.split('.backup.')[1] || '0'),
        path: path.join(dir, f)
      }))
      .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp descending (newest first)

    // Delete backups beyond keepCount
    const toDelete = backups.slice(keepCount)
    for (const backup of toDelete) {
      await fs.unlink(backup.path)
    }
  } catch (error) {
    // Silently ignore cleanup errors to not affect main backup operation
    console.warn('[SettingsWriter] Failed to cleanup old backups:', error)
  }
}

const backupFile = async (filePath: string): Promise<string | null> => {
  try {
    await fs.access(filePath)
  } catch {
    return null
  }

  const backupPath = `${filePath}.backup.${Date.now()}`
  await fs.copyFile(filePath, backupPath)

  // Auto cleanup old backups, keeping only the most recent one
  await cleanupOldBackups(filePath, 1)

  return backupPath
}

const readFileSafe = async (filePath: string): Promise<string | null> => {
  try {
    await fs.access(filePath)
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

const readFileSafeSync = (filePath: string): string | null => {
  try {
    if (!fsSync.existsSync(filePath)) return null
    return fsSync.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Service for writing settings for Claude Code and Codex
 */
class SettingsWriter {
  /**
   * Check if Claude Code process is running
   * 使用精确匹配避免误报 (如 claude-code-router 等)
   */
  async isClaudeRunning(): Promise<boolean> {
    try {
      if (process.platform === 'darwin' || process.platform === 'linux') {
        // 精确匹配 "claude" 进程名 (后面跟空格或行尾)
        // 避免匹配 claude-code-router, claude-xxx 等进程
        const { stdout } = await execAsync('ps aux | grep -E "claude[[:space:]]|claude$" | grep -v grep')
        return stdout.trim().length > 0
      } else if (process.platform === 'win32') {
        // Windows: 使用精确进程名匹配
        const { stdout } = await execAsync('tasklist | findstr /i "^claude.exe"')
        return stdout.trim().length > 0
      }
      return false
    } catch {
      return false
    }
  }

  /**
   * Check if Codex process is running
   * 使用精确匹配避免误报 (如 VSCode 的 codex app-server 等)
   */
  async isCodexRunning(): Promise<boolean> {
    try {
      if (process.platform === 'darwin' || process.platform === 'linux') {
        // 精确匹配 "codex" 或 "codex-cli" 进程名 (后面跟空格或行尾)
        // 排除 VSCode 扩展中的 "codex app-server" 等进程
        const { stdout } = await execAsync('ps aux | grep -E "(^|/)codex[[:space:]]|(^|/)codex$|(^|/)codex-cli[[:space:]]|(^|/)codex-cli$" | grep -v grep | grep -v "codex app-server"')
        return stdout.trim().length > 0
      } else if (process.platform === 'win32') {
        // Windows: 使用精确进程名匹配
        const { stdout } = await execAsync('tasklist | findstr /i "^codex.exe ^codex-cli.exe"')
        return stdout.trim().length > 0
      }
      return false
    } catch {
      return false
    }
  }

  /**
   * Check if target process is running (mode aware)
   */
  async isTargetRunning(mode: AppMode): Promise<boolean> {
    if (mode === 'codex') {
      return this.isCodexRunning()
    }
    return this.isClaudeRunning()
  }

  /**
   * Generate Claude settings.json content
   */
  private generateClaudeSettings(
    station: ClaudeTransferStation,
    baseConfig: ClaudeBaseConfig
  ): ClaudeSettings {
    const settings: ClaudeSettings = {
      env: {
        ...baseConfig.env,
        ANTHROPIC_AUTH_TOKEN: station.authToken,
        ANTHROPIC_BASE_URL: station.baseUrl
      },
      permissions: {
        allow: [...(baseConfig.permissions.allow ?? [])],
        deny: [...(baseConfig.permissions.deny ?? [])]
      }
    }

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
   * Generate Codex config.toml content and metadata
   */
  private generateCodexSettings(
    station: CodexTransferStation,
    baseConfig: CodexBaseConfig
  ): { toml: string; settings: CodexSettings } {
    const merged = mergeCodexBaseConfig(baseConfig, station.customConfig)

    const providerKey = sanitizeProviderKey(
      station.providerKey || station.name || station.baseUrl
    )
    const modelProvider =
      (merged.modelProvider && merged.modelProvider.trim().length > 0
        ? merged.modelProvider
        : providerKey) ?? providerKey

    const lines: string[] = []
    lines.push(`model_provider = "${modelProvider}"`)
    lines.push(`model = "${merged.model}"`)
    if (merged.modelReasoningEffort) {
      lines.push(`model_reasoning_effort = "${merged.modelReasoningEffort}"`)
    }
    lines.push(`disable_response_storage = ${merged.disableResponseStorage ? 'true' : 'false'}`)

    Object.entries(merged.additionalSettings ?? {}).forEach(([key, value]) => {
      if (!key) return
      if (KNOWN_TOP_LEVEL_KEYS.has(key)) return
      lines.push(`${key} = ${formatTomlValue(value)}`)
    })

    lines.push('')
    lines.push(`[model_providers.${providerKey}]`)
    lines.push(`name = "${station.name || providerKey}"`)
    lines.push(`base_url = "${station.baseUrl}"`)
    lines.push(`wire_api = "${merged.wireApi}"`)
    lines.push(`requires_openai_auth = ${merged.requiresOpenaiAuth ? 'true' : 'false'}`)

    // Append raw TOML configuration if provided
    if (station.rawToml && station.rawToml.trim()) {
      lines.push('')
      // 如果 rawToml 已经包含标记,不要重复添加
      const trimmedRawToml = station.rawToml.trim()
      if (!trimmedRawToml.startsWith('# --- ')) {
        lines.push('# --- Advanced Configuration ---')
      }
      lines.push(trimmedRawToml)
    }

    const settings: CodexSettings = {
      modelProvider,
      model: merged.model,
      modelReasoningEffort: merged.modelReasoningEffort,
      disableResponseStorage: merged.disableResponseStorage,
      wireApi: merged.wireApi,
      requiresOpenaiAuth: merged.requiresOpenaiAuth,
      additionalSettings: merged.additionalSettings,
      baseUrl: station.baseUrl,
      providerKey
    }

    return { toml: lines.join('\n'), settings }
  }

  /**
   * Apply station configuration according to mode
   */
  async applyStation(
    station: TransferStation,
    baseConfig: ClaudeBaseConfig | CodexBaseConfig,
    mode: AppMode
  ): Promise<{
    success: boolean
    backups?: { settings?: string; auth?: string }
    settings?: CodexSettings
    error?: string
  }> {
    try {
      if (mode === 'codex') {
        const codexStation = station as CodexTransferStation
        const codexBase = mergeCodexBaseConfig(
          DEFAULT_CODEX_BASE_CONFIG,
          baseConfig as CodexBaseConfig
        )
        const { toml, settings } = this.generateCodexSettings(codexStation, codexBase)

        const [configBackup, authBackup] = await Promise.all([
          backupFile(CODEX_CONFIG_PATH),
          backupFile(CODEX_AUTH_PATH)
        ])

        await ensureDir(CODEX_CONFIG_PATH)
        await fs.writeFile(CODEX_CONFIG_PATH, toml, 'utf-8')

        await ensureDir(CODEX_AUTH_PATH)
        await fs.writeFile(
          CODEX_AUTH_PATH,
          JSON.stringify({ OPENAI_API_KEY: codexStation.authToken }, null, 2),
          'utf-8'
        )

        return {
          success: true,
          backups: {
            settings: configBackup ?? undefined,
            auth: authBackup ?? undefined
          },
          settings: {
            ...settings,
            authToken: codexStation.authToken
          }
        }
      }

      const claudeStation = station as ClaudeTransferStation
      const claudeBase = baseConfig as ClaudeBaseConfig

      const settings = this.generateClaudeSettings(claudeStation, claudeBase)
      const backupPath = await backupFile(CLAUDE_SETTINGS_PATH)

      await ensureDir(CLAUDE_SETTINGS_PATH)
      await fs.writeFile(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')

      const verification = await readFileSafe(CLAUDE_SETTINGS_PATH)
      if (!verification) {
        throw new Error('Settings verification failed: file not found after write')
      }
      const parsed = JSON.parse(verification)
      if (!parsed.env?.ANTHROPIC_AUTH_TOKEN || parsed.env.ANTHROPIC_AUTH_TOKEN.trim() === '') {
        throw new Error('Settings verification failed: ANTHROPIC_AUTH_TOKEN is missing or empty')
      }

      return {
        success: true,
        backups: {
          settings: backupPath ?? undefined
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Parse Codex configuration into structured settings
   */
  private parseCodexConfig(content: string, authContent?: string | null): CodexSettings | null {
    if (!content.trim()) return null

    const modelProviderMatch = content.match(/model_provider\s*=\s*"([^"]+)"/)
    const modelMatch = content.match(/model\s*=\s*"([^"]+)"/)
    const reasoningMatch = content.match(/model_reasoning_effort\s*=\s*"([^"]+)"/)
    const disableMatch = content.match(/disable_response_storage\s*=\s*(true|false)/i)

    const modelProvider = modelProviderMatch?.[1] ?? ''
    const providerKey = sanitizeProviderKey(modelProvider)

    const providerSectionRegex = new RegExp(
      `\\[\\s*model_providers\\.${escapeRegExp(providerKey)}\\s*\\]([\\s\\S]*?)(?:\\n\\[|$)`,
      'i'
    )
    const providerSection = content.match(providerSectionRegex)?.[1] ?? ''

    const baseUrlMatch = providerSection.match(/base_url\s*=\s*"([^"]+)"/)
    const wireApiMatch = providerSection.match(/wire_api\s*=\s*"([^"]+)"/)
    const requiresMatch = providerSection.match(/requires_openai_auth\s*=\s*(true|false)/i)

    const additionalSettings: Record<string, string | number | boolean> = {}
    const topLevelRegex = /([A-Za-z0-9_]+)\s*=\s*("[^"]*"|true|false|\d+\.?\d*)/g
    let match: RegExpExecArray | null
    while ((match = topLevelRegex.exec(content)) !== null) {
      const key = match[1]
      if (KNOWN_TOP_LEVEL_KEYS.has(key)) continue
      const rawValue = match[2]
      if (rawValue.startsWith('"')) {
        additionalSettings[key] = rawValue.slice(1, -1)
      } else if (rawValue === 'true' || rawValue === 'false') {
        additionalSettings[key] = rawValue === 'true'
      } else {
        const num = Number(rawValue)
        additionalSettings[key] = Number.isNaN(num) ? rawValue : num
      }
    }

    let authToken: string | undefined
    if (authContent) {
      try {
        const parsed = JSON.parse(authContent)
        if (typeof parsed.OPENAI_API_KEY === 'string') {
          authToken = parsed.OPENAI_API_KEY
        }
      } catch (error) {
        console.warn('[SettingsWriter] Failed to parse Codex auth.json:', error)
      }
    }

    return {
      modelProvider,
      model: modelMatch?.[1] ?? '',
      modelReasoningEffort: reasoningMatch?.[1],
      disableResponseStorage: disableMatch ? disableMatch[1].toLowerCase() === 'true' : undefined,
      baseUrl: baseUrlMatch?.[1],
      wireApi: wireApiMatch?.[1],
      requiresOpenaiAuth: requiresMatch ? requiresMatch[1].toLowerCase() === 'true' : undefined,
      additionalSettings,
      authToken,
      providerKey
    }
  }

  /**
   * Get current settings (async)
   */
  async getCurrentSettings(mode: AppMode): Promise<ActiveSettings | null> {
    if (mode === 'codex') {
      const [configContent, authContent] = await Promise.all([
        readFileSafe(CODEX_CONFIG_PATH),
        readFileSafe(CODEX_AUTH_PATH)
      ])
      if (!configContent) return null
      const parsed = this.parseCodexConfig(configContent, authContent)
      if (!parsed) return null
      return { mode: 'codex', settings: parsed }
    }

    const content = await readFileSafe(CLAUDE_SETTINGS_PATH)
    if (!content) return null
    try {
      const parsed = JSON.parse(content) as ClaudeSettings
      return { mode: 'claude', settings: parsed }
    } catch (error) {
      console.error('[SettingsWriter] Failed to parse Claude settings:', error)
      return null
    }
  }

  /**
   * Get current settings (sync)
   */
  getCurrentSettingsSync(mode: AppMode): ActiveSettings | null {
    if (mode === 'codex') {
      const configContent = readFileSafeSync(CODEX_CONFIG_PATH)
      if (!configContent) return null
      const authContent = readFileSafeSync(CODEX_AUTH_PATH)
      const parsed = this.parseCodexConfig(configContent, authContent)
      if (!parsed) return null
      return { mode: 'codex', settings: parsed }
    }

    const content = readFileSafeSync(CLAUDE_SETTINGS_PATH)
    if (!content) return null
    try {
      const parsed = JSON.parse(content) as ClaudeSettings
      return { mode: 'claude', settings: parsed }
    } catch {
      return null
    }
  }

  /**
   * Retrieve path(s) depending on mode
   */
  getSettingsPath(mode: AppMode): { settings: string; auth?: string } {
    if (mode === 'codex') {
      return {
        settings: CODEX_CONFIG_PATH,
        auth: CODEX_AUTH_PATH
      }
    }
    return {
      settings: CLAUDE_SETTINGS_PATH
    }
  }
}

export const settingsWriter = new SettingsWriter()
