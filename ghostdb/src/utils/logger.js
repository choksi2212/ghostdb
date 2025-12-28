/**
 * Logger - Simple logging utility
 */

class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  error(message, ...args) {
    if (this.levels[this.level] >= this.levels.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.levels[this.level] >= this.levels.warn) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message, ...args) {
    if (this.levels[this.level] >= this.levels.info) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  debug(message, ...args) {
    if (this.levels[this.level] >= this.levels.debug) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
}

module.exports = Logger;
