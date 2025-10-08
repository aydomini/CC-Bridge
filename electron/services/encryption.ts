import crypto from 'crypto'
import { app } from 'electron'

/**
 * Simple encryption utility using device-specific key
 * This provides basic security for storing auth tokens
 */
class EncryptionService {
  private algorithm = 'aes-256-cbc'
  private key: Buffer
  private iv: Buffer
  private legacyKey: Buffer | null = null
  private legacyIv: Buffer | null = null

  constructor() {
    // Generate key from machine ID (basic device fingerprint)
    const machineId = this.getMachineId()
    console.log('[Encryption] Using machine ID (first 20 chars):', machineId.substring(0, 20))
    this.key = crypto.scryptSync(machineId, 'salt', 32)
    this.iv = crypto.scryptSync(machineId, 'iv', 16)

    // Generate legacy keys for migration
    const legacyId = this.getLegacyMachineId()
    console.log('[Encryption] Using legacy ID (first 20 chars):', legacyId.substring(0, 20))
    if (legacyId !== machineId) {
      this.legacyKey = crypto.scryptSync(legacyId, 'salt', 32)
      this.legacyIv = crypto.scryptSync(legacyId, 'iv', 16)
    }
  }

  /**
   * Get a unique machine identifier
   */
  private getMachineId(): string {
    // Use a consistent identifier across dev and production modes
    // This uses app's user data path which remains constant
    try {
      const userDataPath = app.getPath('userData')
      return crypto.createHash('sha256').update(userDataPath).digest('hex').substring(0, 32)
    } catch {
      // Fallback for development mode
      const fallback = process.env.USER || 'dev-user'
      return crypto.createHash('sha256').update(fallback).digest('hex').substring(0, 32)
    }
  }

  /**
   * Get legacy machine identifier (for migration from old encryption method)
   */
  private getLegacyMachineId(): string {
    try {
      const appPath = app.getPath('exe')
      console.log('[Encryption] Legacy exe path:', appPath)
      return crypto.createHash('sha256').update(appPath).digest('hex').substring(0, 32)
    } catch {
      const fallback = process.env.USER || 'dev-user'
      console.log('[Encryption] Legacy fallback to USER:', fallback)
      return crypto.createHash('sha256').update(fallback).digest('hex').substring(0, 32)
    }
  }

  /**
   * Encrypt a string
   */
  encrypt(text: string): string {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  }

  /**
   * Decrypt a string with automatic legacy key fallback
   */
  decrypt(encryptedText: string): string {
    // Try current key first
    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv)
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error) {
      // Try legacy key if available
      if (this.legacyKey && this.legacyIv) {
        try {
          const decipher = crypto.createDecipheriv(this.algorithm, this.legacyKey, this.legacyIv)
          let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
          decrypted += decipher.final('utf8')
          // Successfully decrypted with legacy key
          return decrypted
        } catch (legacyError) {
          // Both keys failed, suppress excessive logging
          return ''
        }
      }
      return ''
    }
  }

  /**
   * Check if data needs re-encryption (was decrypted using legacy key)
   */
  needsReEncryption(encryptedText: string): boolean {
    // Try current key
    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv)
      decipher.update(encryptedText, 'hex', 'utf8')
      decipher.final('utf8')
      return false // Current key works, no re-encryption needed
    } catch {
      // Try legacy key
      if (this.legacyKey && this.legacyIv) {
        try {
          const decipher = crypto.createDecipheriv(this.algorithm, this.legacyKey, this.legacyIv)
          decipher.update(encryptedText, 'hex', 'utf8')
          decipher.final('utf8')
          return true // Legacy key works, needs re-encryption
        } catch {
          return false // Both failed, cannot re-encrypt
        }
      }
      return false
    }
  }
}

export const encryptionService = new EncryptionService()
