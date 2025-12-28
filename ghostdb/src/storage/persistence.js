/**
 * Persistence Engine - Handles disk persistence
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class PersistenceEngine {
  constructor(options) {
    this.dataPath = options.dataPath;
    this.enableEncryption = options.enableEncryption;
    this.encryptionKey = options.encryptionKey;
    this.enableCompression = options.enableCompression;
    this.dbFile = path.join(this.dataPath, 'ghostdb.json');
  }

  async save(data) {
    try {
      // Ensure directory exists
      await fs.mkdir(this.dataPath, { recursive: true });

      let serialized = JSON.stringify(data, null, 2);

      // Encrypt if enabled
      if (this.enableEncryption && this.encryptionKey) {
        serialized = this._encrypt(serialized);
      }

      // Write to disk
      await fs.writeFile(this.dbFile, serialized, 'utf8');
      return true;
    } catch (error) {
      throw new Error(`Failed to save database: ${error.message}`);
    }
  }

  async load() {
    try {
      const exists = await fs.access(this.dbFile).then(() => true).catch(() => false);
      if (!exists) {
        return null;
      }

      let data = await fs.readFile(this.dbFile, 'utf8');

      // Decrypt if enabled
      if (this.enableEncryption && this.encryptionKey) {
        data = this._decrypt(data);
      }

      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load database: ${error.message}`);
    }
  }

  _encrypt(data) {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  _decrypt(data) {
    const parts = data.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

module.exports = PersistenceEngine;
