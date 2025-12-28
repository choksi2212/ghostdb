/**
 * Memory Engine - Manages in-memory data storage with memory limits
 */

class MemoryEngine {
  constructor(maxMemory = 512 * 1024 * 1024) {
    this.maxMemory = maxMemory;
    this.collections = new Map();
    this.memoryUsage = 0;
  }

  createCollection(name, collection) {
    this.collections.set(name, collection);
    this._updateMemoryUsage();
  }

  getCollection(name) {
    return this.collections.get(name);
  }

  deleteCollection(name) {
    const deleted = this.collections.delete(name);
    if (deleted) {
      this._updateMemoryUsage();
    }
    return deleted;
  }

  get(collectionName, id) {
    const collection = this.collections.get(collectionName);
    return collection ? collection.data.get(id) : null;
  }

  *scan(collectionName) {
    const collection = this.collections.get(collectionName);
    if (collection) {
      yield* collection.data.values();
    }
  }

  getMemoryUsage() {
    return {
      used: this.memoryUsage,
      max: this.maxMemory,
      percentage: (this.memoryUsage / this.maxMemory) * 100
    };
  }

  clear() {
    this.collections.clear();
    this.memoryUsage = 0;
  }

  _updateMemoryUsage() {
    // Rough estimation of memory usage
    let total = 0;
    for (const collection of this.collections.values()) {
      total += JSON.stringify(Array.from(collection.data.values())).length;
    }
    this.memoryUsage = total;

    if (this.memoryUsage > this.maxMemory) {
      throw new Error(`Memory limit exceeded: ${this.memoryUsage} > ${this.maxMemory}`);
    }
  }
}

module.exports = MemoryEngine;
