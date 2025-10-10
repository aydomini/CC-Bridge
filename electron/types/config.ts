export type AppMode = 'claude' | 'codex'

/**
 * Currency type
 */
export type Currency = 'USD' | 'CNY'

/**
 * Base configuration template for Claude Code settings
 * Supports arbitrary additional fields at top level
 */
export interface ClaudeBaseConfig {
  env?: Record<string, string>
  permissions?: {
    allow: string[]
    deny: string[]
  }
  [key: string]: any // Allow arbitrary additional fields
}

/**
 * Base configuration template for Codex settings
 * Supports arbitrary additional fields at top level
 */
export interface CodexBaseConfig {
  modelProvider?: string
  model: string
  modelReasoningEffort: string
  disableResponseStorage: boolean
  wireApi: string
  requiresOpenaiAuth: boolean
  additionalSettings?: Record<string, string | number | boolean>
  [key: string]: any // Allow arbitrary additional fields
}

interface StationCommon {
  id: string
  name: string
  authToken: string
  baseUrl: string
  favicon?: string
  balance?: number
  currency?: Currency
  balanceLastUpdated?: number
  createdAt: number
  lastUsed?: number
}

/**
 * Transfer station configuration
 */
export interface ClaudeTransferStation extends StationCommon {
  customConfig?: Partial<ClaudeBaseConfig>
}

export interface CodexTransferStation extends StationCommon {
  providerKey?: string
  customConfig?: Partial<CodexBaseConfig>
  rawToml?: string // Additional raw TOML configuration (e.g., MCP servers)
}

export type TransferStation = ClaudeTransferStation | CodexTransferStation

// Backwards compatibility alias
export type BaseConfig = ClaudeBaseConfig

interface ModeState<B, T extends TransferStation> {
  baseConfig: B
  stations: T[]
  activeStationId?: string | null
}

/**
 * Application configuration
 */
export interface AppConfig {
  version: string
  activeMode: AppMode
  claude: ModeState<ClaudeBaseConfig, ClaudeTransferStation>
  codex: ModeState<CodexBaseConfig, CodexTransferStation>
  language?: 'en' | 'zh' // UI language preference
  settings: {
    storageLocation: string // custom storage path
    autoBackup: boolean
  }
}

/**
 * Final settings.json structure for Claude Code
 */
export interface ClaudeSettings {
  env: {
    ANTHROPIC_AUTH_TOKEN: string
    ANTHROPIC_BASE_URL: string
    CLAUDE_CODE_MAX_OUTPUT_TOKENS?: string
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: string
    API_TIMEOUT_MS?: string
    BASH_DEFAULT_TIMEOUT_MS?: string
    BASH_MAX_TIMEOUT_MS?: string
    MCP_TIMEOUT?: string
    MCP_TOOL_TIMEOUT?: string
    CLAUDE_API_TIMEOUT?: string
  }
  permissions: {
    allow: string[]
    deny: string[]
  }
}

/**
 * Parsed Codex configuration snapshot
 */
export interface CodexSettings {
  modelProvider: string
  model: string
  modelReasoningEffort?: string
  disableResponseStorage?: boolean
  baseUrl?: string
  wireApi?: string
  requiresOpenaiAuth?: boolean
  additionalSettings?: Record<string, string | number | boolean>
  authToken?: string
  providerKey?: string
}

export type ActiveSettings =
  | { mode: 'claude'; settings: ClaudeSettings }
  | { mode: 'codex'; settings: CodexSettings }

/**
 * Default base configuration
 */
export const DEFAULT_BASE_CONFIG: ClaudeBaseConfig = {
  env: {},
  permissions: {
    allow: [],
    deny: []
  }
}

export const DEFAULT_CODEX_BASE_CONFIG: CodexBaseConfig = {
  modelProvider: '',
  model: 'gpt-5-codex',
  modelReasoningEffort: 'high',
  disableResponseStorage: true,
  wireApi: 'responses',
  requiresOpenaiAuth: true,
  additionalSettings: {}
}
