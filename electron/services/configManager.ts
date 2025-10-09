import crypto from 'crypto'
import { AppConfig, TransferStation, BaseConfig, DEFAULT_BASE_CONFIG } from '../types/config.js'
import { encryptionService } from './encryption.js'
import { SimpleStore } from './simpleStore.js'

/**
 * Configuration manager using SimpleStore
 */
class ConfigManager {
  private store: SimpleStore<AppConfig>

  constructor() {
    this.store = new SimpleStore<AppConfig>({
      defaults: {
        version: '1.0.0',
        baseConfig: DEFAULT_BASE_CONFIG,
        stations: [],
        settings: {
          storageLocation: 'default',
          autoBackup: true
        }
      }
    })
  }

  /**
   * Get all transfer stations
   */
  getStations(): TransferStation[] {
    const stations = this.store.get('stations', [])

    // Decrypt auth tokens and check if re-encryption is needed
    let needsMigration = false
    const decryptedStations = stations.map(station => {
      const decrypted = encryptionService.decrypt(station.authToken)

      // If decryption failed (empty token), this station needs manual re-entry
      if (!decrypted && station.authToken) {
        console.warn(`[ConfigManager] Failed to decrypt token for station: ${station.name}`)
      }

      if (decrypted && encryptionService.needsReEncryption(station.authToken)) {
        needsMigration = true
      }
      return {
        ...station,
        authToken: decrypted
      }
    })

    // Automatically re-encrypt with new key if needed
    if (needsMigration) {
      console.log('[ConfigManager] Migrating encryption keys...')
      const reEncryptedStations = stations.map(station => {
        const decrypted = encryptionService.decrypt(station.authToken)
        if (decrypted && encryptionService.needsReEncryption(station.authToken)) {
          return {
            ...station,
            authToken: encryptionService.encrypt(decrypted)
          }
        }
        return station
      })
      this.store.set('stations', reEncryptedStations)
      console.log('[ConfigManager] Encryption migration completed')
    }

    return decryptedStations
  }

  /**
   * Check if any station has decryption issues
   */
  hasDecryptionIssues(): boolean {
    const stations = this.store.get('stations', [])
    return stations.some(station => {
      const decrypted = encryptionService.decrypt(station.authToken)
      return !decrypted && station.authToken
    })
  }

  /**
   * Get a single station by ID
   */
  getStation(id: string): TransferStation | undefined {
    const stations = this.getStations()
    return stations.find(s => s.id === id)
  }

  /**
   * Add a new transfer station
   */
  addStation(station: Omit<TransferStation, 'id' | 'createdAt'>): TransferStation {
    const newStation: TransferStation = {
      ...station,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      // Encrypt auth token before storing
      authToken: encryptionService.encrypt(station.authToken)
    }

    const stations = this.store.get('stations', [])
    stations.push(newStation)
    this.store.set('stations', stations)

    // Return decrypted version
    return {
      ...newStation,
      authToken: station.authToken
    }
  }

  /**
   * Update an existing station
   */
  updateStation(id: string, updates: Partial<TransferStation>): boolean {
    const stations = this.store.get('stations', [])
    const index = stations.findIndex(s => s.id === id)

    if (index === -1) return false

    // Encrypt auth token if being updated
    if (updates.authToken) {
      updates.authToken = encryptionService.encrypt(updates.authToken)
    }

    stations[index] = {
      ...stations[index],
      ...updates,
      id // Prevent ID change
    }

    this.store.set('stations', stations)
    return true
  }

  /**
   * Delete a station
   */
  deleteStation(id: string): boolean {
    const stations = this.store.get('stations', [])
    const filtered = stations.filter(s => s.id !== id)

    if (filtered.length === stations.length) return false

    this.store.set('stations', filtered)
    return true
  }

  /**
   * Get base configuration
   */
  getBaseConfig(): BaseConfig {
    return this.store.get('baseConfig', DEFAULT_BASE_CONFIG)
  }

  /**
   * Update base configuration
   */
  updateBaseConfig(config: BaseConfig): void {
    this.store.set('baseConfig', config)
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
