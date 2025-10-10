import crypto from 'crypto'
import {
  AppConfig,
  AppMode,
  TransferStation,
  ClaudeTransferStation,
  CodexTransferStation,
  ClaudeBaseConfig,
  CodexBaseConfig,
  DEFAULT_BASE_CONFIG,
  DEFAULT_CODEX_BASE_CONFIG
} from '../types/config.js'
import { encryptionService } from './encryption.js'
import { SimpleStore } from './simpleStore.js'

const APP_VERSION = '2.0.0'

type ModeKey = 'claude' | 'codex'

const cloneClaudeBaseConfig = (base?: ClaudeBaseConfig): ClaudeBaseConfig => ({
  ...base, // Preserve all fields including additional ones
  env: {
    ...(DEFAULT_BASE_CONFIG.env ?? {}),
    ...(base?.env ?? {})
  },
  permissions: {
    allow: [...(DEFAULT_BASE_CONFIG.permissions?.allow ?? []), ...(base?.permissions?.allow ?? [])],
    deny: [...(DEFAULT_BASE_CONFIG.permissions?.deny ?? []), ...(base?.permissions?.deny ?? [])]
  }
})

const cloneCodexBaseConfig = (base?: CodexBaseConfig): CodexBaseConfig => ({
  ...base, // Preserve all fields including additional ones
  modelProvider: base?.modelProvider ?? DEFAULT_CODEX_BASE_CONFIG.modelProvider,
  model: base?.model ?? DEFAULT_CODEX_BASE_CONFIG.model,
  modelReasoningEffort: base?.modelReasoningEffort ?? DEFAULT_CODEX_BASE_CONFIG.modelReasoningEffort,
  disableResponseStorage: base?.disableResponseStorage ?? DEFAULT_CODEX_BASE_CONFIG.disableResponseStorage,
  wireApi: base?.wireApi ?? DEFAULT_CODEX_BASE_CONFIG.wireApi,
  requiresOpenaiAuth: base?.requiresOpenaiAuth ?? DEFAULT_CODEX_BASE_CONFIG.requiresOpenaiAuth,
  additionalSettings: {
    ...(DEFAULT_CODEX_BASE_CONFIG.additionalSettings ?? {}),
    ...(base?.additionalSettings ?? {})
  }
})

const createDefaultModeState = <B, T extends TransferStation>(
  baseConfig: B
) => ({
  baseConfig,
  stations: [] as T[],
  activeStationId: null as string | null
})

const createDefaultConfig = (): AppConfig => ({
  version: APP_VERSION,
  activeMode: 'claude',
  claude: createDefaultModeState<ClaudeBaseConfig, ClaudeTransferStation>(
    cloneClaudeBaseConfig(DEFAULT_BASE_CONFIG)
  ),
  codex: createDefaultModeState<CodexBaseConfig, CodexTransferStation>(
    cloneCodexBaseConfig(DEFAULT_CODEX_BASE_CONFIG)
  ),
  language: 'zh',
  settings: {
    storageLocation: 'default',
    autoBackup: true
  }
})

/**
 * Configuration manager using SimpleStore
 */
class ConfigManager {
  private store: SimpleStore<AppConfig>

  constructor() {
    this.store = new SimpleStore<AppConfig>({
      defaults: createDefaultConfig()
    })
    this.normalizeStore()
  }

  private normalizeStore(): void {
    const snapshot = this.store.getAll() as Partial<AppConfig> & Record<string, any>
    let changed = false

    const legacyBaseConfig = snapshot.baseConfig as ClaudeBaseConfig | undefined
    const legacyStations = snapshot.stations as ClaudeTransferStation[] | undefined

    const normalized: AppConfig = {
      version: APP_VERSION,
      activeMode: (snapshot.activeMode as AppMode) ?? 'claude',
      claude: createDefaultModeState(cloneClaudeBaseConfig()),
      codex: createDefaultModeState(cloneCodexBaseConfig()),
      language: snapshot.language ?? 'zh',
      settings: {
        storageLocation: snapshot.settings?.storageLocation ?? 'default',
        autoBackup: snapshot.settings?.autoBackup ?? true
      }
    }

    // Merge claude data
    if (snapshot.claude) {
      normalized.claude = {
        baseConfig: cloneClaudeBaseConfig(snapshot.claude.baseConfig),
        stations: Array.isArray(snapshot.claude.stations) ? snapshot.claude.stations : [],
        activeStationId: snapshot.claude.activeStationId ?? null
      }
    } else {
      normalized.claude = {
        baseConfig: cloneClaudeBaseConfig(legacyBaseConfig ?? DEFAULT_BASE_CONFIG),
        stations: Array.isArray(legacyStations) ? legacyStations : [],
        activeStationId: null
      }
      if (legacyStations || legacyBaseConfig) {
        changed = true
      }
    }

    // Merge codex data
    if (snapshot.codex) {
      normalized.codex = {
        baseConfig: cloneCodexBaseConfig(snapshot.codex.baseConfig),
        stations: Array.isArray(snapshot.codex.stations) ? snapshot.codex.stations : [],
        activeStationId: snapshot.codex.activeStationId ?? null
      }
    } else {
      normalized.codex = createDefaultModeState<CodexBaseConfig, CodexTransferStation>(
        cloneCodexBaseConfig(DEFAULT_CODEX_BASE_CONFIG)
      )
      changed = true
    }

    // Ensure version consistency
    if (snapshot.version !== APP_VERSION) {
      changed = true
    }

    // Detect other differences
    if (JSON.stringify(snapshot.claude?.baseConfig) !== JSON.stringify(normalized.claude.baseConfig)) {
      changed = true
    }
    if (JSON.stringify(snapshot.codex?.baseConfig) !== JSON.stringify(normalized.codex.baseConfig)) {
      changed = true
    }

    if (changed || !snapshot.claude || !snapshot.codex) {
      this.store.replace(normalized)
    }
  }

  private getModeKey(mode: AppMode): ModeKey {
    return mode === 'codex' ? 'codex' : 'claude'
  }

  private getModeState(mode: AppMode) {
    const key = this.getModeKey(mode)
    return this.store.get(key)
  }

  private setModeState(mode: AppMode, state: AppConfig['claude'] | AppConfig['codex']): void {
    const key = this.getModeKey(mode)
    this.store.set(key, state as any)
  }

  private processStations(stations: TransferStation[]): {
    decrypted: TransferStation[]
    migrated?: TransferStation[]
  } {
    let needsMigration = false

    const decrypted = stations.map(station => {
      const decryptedToken = encryptionService.decrypt(station.authToken)

      if (!decryptedToken && station.authToken) {
        console.warn(`[ConfigManager] Failed to decrypt token for station: ${station.name}`)
      }

      if (decryptedToken && encryptionService.needsReEncryption(station.authToken)) {
        needsMigration = true
      }

      return {
        ...station,
        authToken: decryptedToken
      }
    })

    if (!needsMigration) {
      return { decrypted }
    }

    const migrated = stations.map(station => {
      const decryptedToken = encryptionService.decrypt(station.authToken)
      if (decryptedToken && encryptionService.needsReEncryption(station.authToken)) {
        return {
          ...station,
          authToken: encryptionService.encrypt(decryptedToken)
        }
      }
      return station
    })

    return { decrypted, migrated }
  }

  getActiveMode(): AppMode {
    return this.store.get('activeMode', 'claude')
  }

  setActiveMode(mode: AppMode): void {
    this.store.set('activeMode', mode)
  }

  /**
   * Get all transfer stations for the specified mode
   */
  getStations(mode: AppMode = this.getActiveMode()): TransferStation[] {
    const state = this.getModeState(mode)
    const { decrypted, migrated } = this.processStations(state.stations)

    if (migrated) {
      this.setModeState(mode, {
        ...state,
        stations: migrated
      } as any)
    }

    return decrypted
  }

  /**
   * Check if any station has decryption issues
   */
  hasDecryptionIssues(mode: AppMode = this.getActiveMode()): boolean {
    const state = this.getModeState(mode)
    return state.stations.some(station => {
      const decrypted = encryptionService.decrypt(station.authToken)
      return !decrypted && !!station.authToken
    })
  }

  /**
   * Get active station id for mode
   */
  getActiveStationId(mode: AppMode = this.getActiveMode()): string | null {
    return this.getModeState(mode).activeStationId ?? null
  }

  setActiveStationId(mode: AppMode, stationId: string | null): void {
    const state = this.getModeState(mode)
    this.setModeState(mode, {
      ...state,
      activeStationId: stationId
    } as any)
  }

  /**
   * Get a single station by ID
   */
  getStation(id: string, mode: AppMode = this.getActiveMode()): TransferStation | undefined {
    const stations = this.getStations(mode)
    return stations.find(s => s.id === id)
  }

  getAllStations(): Record<AppMode, TransferStation[]> {
    return {
      claude: this.getStations('claude'),
      codex: this.getStations('codex')
    }
  }

  /**
   * Add a new transfer station
   */
  addStation(
    station: Omit<TransferStation, 'id' | 'createdAt'>,
    mode: AppMode = this.getActiveMode()
  ): TransferStation {
    const encryptedStation: TransferStation = {
      ...station,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      authToken: encryptionService.encrypt(station.authToken)
    }

    const state = this.getModeState(mode)
    const stations = [...state.stations, encryptedStation]

    this.setModeState(mode, {
      ...state,
      stations
    } as any)

    return {
      ...encryptedStation,
      authToken: station.authToken
    }
  }

  /**
   * Update an existing station
   */
  updateStation(
    id: string,
    updates: Partial<TransferStation>,
    mode: AppMode = this.getActiveMode()
  ): boolean {
    const state = this.getModeState(mode)
    const index = state.stations.findIndex(s => s.id === id)

    if (index === -1) return false

    const updatedStations = [...state.stations]
    const current = updatedStations[index]

    const next: TransferStation = {
      ...current,
      ...updates,
      id,
      authToken: updates.authToken
        ? encryptionService.encrypt(updates.authToken)
        : current.authToken
    }

    updatedStations[index] = next

    this.setModeState(mode, {
      ...state,
      stations: updatedStations
    } as any)

    return true
  }

  /**
   * Delete a station
   */
  deleteStation(id: string, mode: AppMode = this.getActiveMode()): boolean {
    const state = this.getModeState(mode)
    const filtered = state.stations.filter(s => s.id !== id)

    if (filtered.length === state.stations.length) return false

    const activeStationId = state.activeStationId === id ? null : state.activeStationId

    this.setModeState(mode, {
      ...state,
      stations: filtered,
      activeStationId
    } as any)

    return true
  }

  /**
   * Get base configuration
   */
  getBaseConfig(mode: AppMode = this.getActiveMode()): ClaudeBaseConfig | CodexBaseConfig {
    const state = this.getModeState(mode)
    return mode === 'codex'
      ? cloneCodexBaseConfig(state.baseConfig as CodexBaseConfig)
      : cloneClaudeBaseConfig(state.baseConfig as ClaudeBaseConfig)
  }

  /**
   * Update base configuration
   */
  updateBaseConfig(
    config: ClaudeBaseConfig | CodexBaseConfig,
    mode: AppMode = this.getActiveMode()
  ): void {
    const state = this.getModeState(mode)
    const merged =
      mode === 'codex'
        ? cloneCodexBaseConfig(config as CodexBaseConfig)
        : cloneClaudeBaseConfig(config as ClaudeBaseConfig)

    this.setModeState(mode, {
      ...state,
      baseConfig: merged
    } as any)
  }

  /**
   * Update last used timestamp for station
   */
  markStationAsUsed(id: string, mode: AppMode = this.getActiveMode()): void {
    const state = this.getModeState(mode)
    const index = state.stations.findIndex(s => s.id === id)
    if (index === -1) return

    const updatedStations = [...state.stations]
    updatedStations[index] = {
      ...updatedStations[index],
      lastUsed: Date.now()
    }

    this.setModeState(mode, {
      ...state,
      stations: updatedStations
    } as any)
  }

  /**
   * Get store file path
   */
  getStorePath(): string {
    return this.store.path
  }

  /**
   * Get language preference
   */
  getLanguage(): 'en' | 'zh' {
    return this.store.get('language', 'zh')
  }

  /**
   * Set language preference
   */
  setLanguage(language: 'en' | 'zh'): void {
    this.store.set('language', language)
  }
}

export const configManager = new ConfigManager()
