/**
 * Base configuration template for Claude Code settings
 */
export interface BaseConfig {
  env: {
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
 * Currency type
 */
export type Currency = 'USD' | 'CNY'

/**
 * Transfer station configuration
 */
export interface TransferStation {
  id: string
  name: string
  authToken: string // ANTHROPIC_AUTH_TOKEN (encrypted in storage)
  baseUrl: string // ANTHROPIC_BASE_URL
  favicon?: string // Station favicon URL

  // Balance info
  balance?: number
  currency?: Currency // 'USD' or 'CNY', default: 'USD'
  balanceLastUpdated?: number // timestamp

  // Custom configuration (overrides base config)
  customConfig?: Partial<BaseConfig>

  // Metadata
  createdAt: number
  lastUsed?: number
}

/**
 * Application configuration
 */
export interface AppConfig {
  version: string
  baseConfig: BaseConfig
  stations: TransferStation[]
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
 * Default base configuration
 */
export const DEFAULT_BASE_CONFIG: BaseConfig = {
  env: {
    ANTHROPIC_AUTH_TOKEN: '',
    ANTHROPIC_BASE_URL: ''
  },
  permissions: {
    allow: [],
    deny: []
  }
}
