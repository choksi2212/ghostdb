/**
 * Index Manager
 * Coordinates hash and B+ tree indexes for optimal query performance
 * 
 * Strategy:
 * - Hash index for equality queries (O(1))
 * - B+ tree for range queries (O(log n))
 * - Automatic index selection
 */

const HashIndex = require('./hash-index');
const ShardedHashIndex = require('./sharded-hash-index');
const BPlusTree = require('./btree-index');

class IndexManager {
  constructor(storageEngine) {
    this.storage = storageEngine;
    
    // Indexes per collection per field
    // Structure: Map<collectionName, Map<fieldName, {hash, btree}>>
    this.indexes = new Map();
    
    // Statistics
    this.stats = {
      indexHits: 0,
      indexMisses: 0,
      indexCreations: 0,
      indexUpdates: 0
    };
  }

  /**
   * Create index on field
   * SOLUTION 5: Uses ShardedHashIndex for high concurrency
   */
  async createIndex(collectionName, fieldName, options = {}) {
    const type = options.type || 'both'; // 'hash', 'btree', or 'both'
    const useSharding = options.sharded !== false; // Default: use sharding
    
    if (!this.indexes.has(collectionName)) {
      this.indexes.set(collectionName, new Map());
    }
    
    const collectionIndexes = this.indexes.get(collectionName);
    
    if (collectionIndexes.has(fieldName)) {
      throw new Error(`Index on ${collectionName}.${fieldName} already exists`);
    }
    
    const index = {
      fieldName,
      // SOLUTION 5: Use ShardedHashIndex for better concurrency
      hash: type === 'hash' || type === 'both' 
        ? (useSharding ? new ShardedHashIndex(16) : new HashIndex()) 
        : null,
      btree: type === 'btree' || type === 'both' ? new BPlusTree() : null,
      unique: options.unique || false,
      sharded: useSharding,
      createdAt: Date.now()
    };
    
    collectionIndexes.set(fieldName, index);
    this.stats.indexCreations++;
    
    // Build index from existing data
    await this._buildIndex(collectionName, index);
    
    return index;
  }

  /**
   * Build index from existing documents
   */
  async _buildIndex(collectionName, index) {
    const collection = this.storage.getCollection(collectionName);
    if (!collection) return;
    
    for (const doc of collection.data.values()) {
      const fieldValue = doc[index.fieldName];
      if (fieldValue !== undefined) {
        await this._addToIndex(index, fieldValue, doc._id);
      }
    }
  }

  /**
   * Add entry to index
   */
  async _addToIndex(index, fieldValue, docId) {
    if (index.hash) {
      await index.hash.insert(fieldValue, docId);
    }
    if (index.btree) {
      await index.btree.insert(fieldValue, docId);
    }
  }

  /**
   * Update indexes after document insert/update
   */
  async updateIndexes(collectionName, document, operation, oldDocument = null) {
    this.stats.indexUpdates++;
    
    const collectionIndexes = this.indexes.get(collectionName);
    if (!collectionIndexes) return;
    
    for (const [fieldName, index] of collectionIndexes) {
      const newValue = document[fieldName];
      const oldValue = oldDocument ? oldDocument[fieldName] : null;
      
      if (operation === 'insert' || operation === 'update') {
        // Remove old value if updating
        if (operation === 'update' && oldValue !== undefined) {
          await this._removeFromIndex(index, oldValue, document._id);
        }
        
        // Add new value
        if (newValue !== undefined) {
          await this._addToIndex(index, newValue, document._id);
        }
      } else if (operation === 'delete') {
        // Remove from index
        if (newValue !== undefined) {
          await this._removeFromIndex(index, newValue, document._id);
        }
      }
    }
  }

  /**
   * Remove entry from index
   */
  async _removeFromIndex(index, fieldValue, docId) {
    if (index.hash) {
      await index.hash.delete(fieldValue);
    }
    if (index.btree) {
      await index.btree.delete(fieldValue);
    }
  }

  /**
   * Lookup using index
   */
  async lookup(collectionName, fieldName, value, options = {}) {
    const collectionIndexes = this.indexes.get(collectionName);
    if (!collectionIndexes || !collectionIndexes.has(fieldName)) {
      this.stats.indexMisses++;
      return null; // No index available
    }
    
    this.stats.indexHits++;
    const index = collectionIndexes.get(fieldName);
    
    // Use hash index for equality
    if (options.type === 'equality' || !options.type) {
      if (index.hash) {
        return await index.hash.get(value);
      }
    }
    
    // Use B+ tree for range queries
    if (options.type === 'range' && index.btree) {
      return await index.btree.rangeQuery(options.start, options.end);
    }
    
    return null;
  }

  /**
   * Check if index exists
   */
  hasIndex(collectionName, fieldName) {
    const collectionIndexes = this.indexes.get(collectionName);
    return collectionIndexes && collectionIndexes.has(fieldName);
  }

  /**
   * Get index statistics
   */
  getIndexStats(collectionName, fieldName) {
    const collectionIndexes = this.indexes.get(collectionName);
    if (!collectionIndexes || !collectionIndexes.has(fieldName)) {
      return null;
    }
    
    const index = collectionIndexes.get(fieldName);
    
    return {
      fieldName,
      hash: index.hash ? index.hash.getStats() : null,
      btree: index.btree ? index.btree.getStats() : null,
      createdAt: index.createdAt
    };
  }

  /**
   * Get all statistics
   */
  getStats() {
    const indexStats = [];
    
    for (const [collectionName, collectionIndexes] of this.indexes) {
      for (const [fieldName, index] of collectionIndexes) {
        indexStats.push({
          collection: collectionName,
          field: fieldName,
          hash: index.hash ? index.hash.getStats() : null,
          btree: index.btree ? index.btree.getStats() : null
        });
      }
    }
    
    return {
      ...this.stats,
      hitRate: this.stats.indexHits + this.stats.indexMisses > 0
        ? ((this.stats.indexHits / (this.stats.indexHits + this.stats.indexMisses)) * 100).toFixed(2) + '%'
        : '0%',
      indexes: indexStats
    };
  }

  /**
   * Drop index
   */
  dropIndex(collectionName, fieldName) {
    const collectionIndexes = this.indexes.get(collectionName);
    if (!collectionIndexes) return false;
    
    return collectionIndexes.delete(fieldName);
  }

  /**
   * Clear all indexes
   */
  clear() {
    this.indexes.clear();
    this.stats = {
      indexHits: 0,
      indexMisses: 0,
      indexCreations: 0,
      indexUpdates: 0
    };
  }
}

module.exports = IndexManager;
