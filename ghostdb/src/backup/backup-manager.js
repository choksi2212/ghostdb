/**
 * Backup Manager - Handles database backups
 */

const fs = require('fs').promises;
const path = require('path');

class BackupManager {
  constructor(options) {
    this.dataPath = options.dataPath;
    this.backupPath = path.join(this.dataPath, 'backups');
  }

  async createBackup(data) {
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupPath, `backup-${timestamp}.json`);

      await fs.writeFile(backupFile, JSON.stringify(data, null, 2), 'utf8');

      // Clean old backups (keep last 10)
      await this._cleanOldBackups();

      return backupFile;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async restore(backupPath) {
    try {
      const data = await fs.readFile(backupPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupPath);
      return files
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()
        .reverse();
    } catch (error) {
      return [];
    }
  }

  async _cleanOldBackups() {
    const backups = await this.listBackups();
    if (backups.length > 10) {
      const toDelete = backups.slice(10);
      for (const backup of toDelete) {
        await fs.unlink(path.join(this.backupPath, backup));
      }
    }
  }
}

module.exports = BackupManager;
