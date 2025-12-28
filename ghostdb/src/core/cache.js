/**
 * Cache Layer - LRU cache for query results
 */

class CacheLayer {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.accessOrder = [];
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    // Update access order (LRU)
    this._updateAccessOrder(key);
    return this.cache.get(key);
  }

  set(key, value) {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this._evictLRU();
    }

    this.cache.set(key, value);
    this._updateAccessOrder(key);
  }

  invalidate(key) {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  size() {
    return this.cache.size;
  }

  _updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  _evictLRU() {
    if (this.accessOrder.length === 0) {
      return;
    }
    const lruKey = this.accessOrder.shift();
    this.cache.delete(lruKey);
  }
}

module.exports = CacheLayer;
