import fs from 'fs'
import path from 'path'
import { app } from 'electron'

/**
 * Simple JSON file-based storage
 * Replacement for electron-store to reduce bundle size
 */
export class SimpleStore<T extends Record<string, any>> {
  private filePath: string
  private data: T
  private defaults: T

  constructor(options: { defaults: T }) {
    this.defaults = options.defaults
    this.filePath = path.join(app.getPath('userData'), 'config.json')
    this.data = this.load()
  }

  /**
   * Load data from file
   */
  private load(): T {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf8')
        return { ...this.defaults, ...JSON.parse(content) }
      }
    } catch (error) {
      console.error('[SimpleStore] Failed to load config:', error)
    }
    return { ...this.defaults }
  }

  /**
   * Save data to file
   */
  private save(): void {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8')
    } catch (error) {
      console.error('[SimpleStore] Failed to save config:', error)
    }
  }

  /**
   * Get value by key
   */
  get<K extends keyof T>(key: K): T[K]
  get<K extends keyof T>(key: K, defaultValue: T[K]): T[K]
  get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K] {
    const value = this.data[key]
    return value !== undefined ? value : (defaultValue ?? this.defaults[key])
  }

  /**
   * Set value by key
   */
  set<K extends keyof T>(key: K, value: T[K]): void {
    this.data[key] = value
    this.save()
  }

  /**
   * Return full data snapshot
   */
  getAll(): T {
    return { ...this.data }
  }

  /**
   * Replace entire store (used for migrations)
   */
  replace(data: T): void {
    this.data = data
    this.save()
  }

  /**
   * Get file path
   */
  get path(): string {
    return this.filePath
  }
}
