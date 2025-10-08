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

  constructor() {
    // Generate key from machine ID (basic device fingerprint)
    const machineId = this.getMachineId()
    this.key = crypto.scryptSync(machineId, 'salt', 32)
    this.iv = crypto.scryptSync(machineId, 'iv', 16)
  }

  /**
   * Get a unique machine identifier
   */
  private getMachineId(): string {
    // Use app path as part of machine ID (simple approach)
    const appPath = app.getPath('exe')
    return crypto.createHash('sha256').update(appPath).digest('hex').substring(0, 32)
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
   * Decrypt a string
   */
  decrypt(encryptedText: string): string {
    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv)
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      return ''
    }
  }
}

export const encryptionService = new EncryptionService()
