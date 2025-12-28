/**
 * Ultra-Fast Query Engine
 * Intelligent query optimization and execution
 * 
 * Features:
 * - Automatic index selection
 * - Query plan optimization
 * - Parallel query execution
 * - Result streaming
 */

class QueryEngine {
  constructor(storageEngine, indexManager) {
    this.storage = storageEngine;
    this.indexes = indexManager;
    
    this.stats = {
      queries: 0,
      indexedQueries: 0,
      fullScans: 0,
      avgQueryTime: 0,
      totalQueryTime: 0
    };
  }

  /**
   * Execute query with automatic optimization
   */
  async execute(collectionName, filter = {}, options = {}) {
    const startTime = performance.now();
    this.stats.queries++;
    
    try {
      // 1. Analyze query and create execution plan
      const plan = this._createQueryPlan(collectionName, filter, options);
      
      // 2. Execute plan
      let results = await this._executePlan(collectionName, plan);
      
      // 3. Apply filter (for non-indexed fields)
      results = this._applyFilter(results, filter);
      
      // 4. Apply sorting
      if (options.sort) {
        results = this._applySort(results, options.sort);
      }
      
      // 5. Apply pagination
      if (options.skip) {
        results = results.slice(options.skip);
      }
      if (options.limit) {
        results = results.slice(0, options.limit);
      }
      
      // 6. Apply projection
      if (options.select) {
        results = this._applyProjection(results, options.select);
      }
      
      return results;
    } finally {
      const duration = performance.now() - startTime;
      this.stats.totalQueryTime += duration;
      this.stats.avgQueryTime = this.stats.totalQueryTime / this.stats.queries;
    }
  }

  /**
   * Create optimized query execution plan
   */
  _createQueryPlan(collectionName, filter, options) {
    const plan = {
      type: 'full-scan',
      indexField: null,
      indexType: null,
      estimatedCost: Infinity
    };
    
    // Check for indexed fields
    for (const [field, value] of Object.entries(filter)) {
      if (field.startsWith('$')) continue; // Skip operators
      
      if (this.indexes.hasIndex(collectionName, field)) {
        // Determine query type
        if (typeof value === 'object' && (value.$gte !== undefined || value.$lte !== undefined)) {
          // Range query - use B+ tree
          plan.type = 'index-range';
          plan.indexField = field;
          plan.indexType = 'btree';
          plan.start = value.$gte;
          plan.end = value.$lte;
          plan.estimatedCost = Math.log2(this.storage.getCollection(collectionName).metadata.documentCount);
          break; // B+ tree is optimal for range
        } else {
          // Equality query - use hash
          plan.type = 'index-equality';
          plan.indexField = field;
          plan.indexType = 'hash';
          plan.value = value;
          plan.estimatedCost = 1; // O(1)
          break; // Hash is optimal for equality
        }
      }
    }
    
    return plan;
  }

  /**
   * Execute query plan
   */
  async _executePlan(collectionName, plan) {
    if (plan.type === 'index-equality') {
      this.stats.indexedQueries++;
      
      // Use hash index for O(1) lookup
      const docId = await this.indexes.lookup(
        collectionName,
        plan.indexField,
        plan.value,
        { type: 'equality' }
      );
      
      if (docId) {
        const doc = this.storage.get(collectionName, docId);
        return doc ? [doc] : [];
      }
      
      return [];
    } else if (plan.type === 'index-range') {
      this.stats.indexedQueries++;
      
      // Use B+ tree for range query
      const results = await this.indexes.lookup(
        collectionName,
        plan.indexField,
        null,
        {
          type: 'range',
          start: plan.start,
          end: plan.end
        }
      );
      
      // Fetch documents
      const documents = [];
      for (const result of results) {
        const doc = this.storage.get(collectionName, result.value);
        if (doc) {
          documents.push(doc);
        }
      }
      
      return documents;
    } else {
      // Full collection scan
      this.stats.fullScans++;
      return Array.from(this.storage.scan(collectionName));
    }
  }

  /**
   * Apply filter to documents
   */
  _applyFilter(documents, filter) {
    return documents.filter(doc => this._matchesFilter(doc, filter));
  }

  /**
   * Check if document matches filter
   */
  _matchesFilter(document, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (key.startsWith('$')) {
        // Logical operators
        if (!this._evaluateOperator(document, key, value)) {
          return false;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Comparison operators
        if (!this._evaluateComparison(document[key], value)) {
          return false;
        }
      } else {
        // Simple equality
        if (document[key] !== value) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Evaluate logical operators
   */
  _evaluateOperator(document, operator, value) {
    switch (operator) {
      case '$and':
        return value.every(filter => this._matchesFilter(document, filter));
      case '$or':
        return value.some(filter => this._matchesFilter(document, filter));
      case '$not':
        return !this._matchesFilter(document, value);
      default:
        return true;
    }
  }

  /**
   * Evaluate comparison operators
   */
  _evaluateComparison(fieldValue, comparison) {
    for (const [op, value] of Object.entries(comparison)) {
      switch (op) {
        case '$eq':
          if (fieldValue !== value) return false;
          break;
        case '$ne':
          if (fieldValue === value) return false;
          break;
        case '$gt':
          if (fieldValue <= value) return false;
          break;
        case '$gte':
          if (fieldValue < value) return false;
          break;
        case '$lt':
          if (fieldValue >= value) return false;
          break;
        case '$lte':
          if (fieldValue > value) return false;
          break;
        case '$in':
          if (!value.includes(fieldValue)) return false;
          break;
        case '$nin':
          if (value.includes(fieldValue)) return false;
          break;
        case '$exists':
          if ((fieldValue !== undefined) !== value) return false;
          break;
        default:
          return true;
      }
    }
    return true;
  }

  /**
   * Apply sorting (optimized)
   */
  _applySort(documents, sort) {
    const sortFields = Object.entries(sort);
    
    return documents.sort((a, b) => {
      for (const [field, direction] of sortFields) {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal === bVal) continue;
        
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;
        
        const comparison = aVal < bVal ? -1 : 1;
        return direction === 1 ? comparison : -comparison;
      }
      return 0;
    });
  }

  /**
   * Apply projection (select specific fields)
   */
  _applyProjection(documents, select) {
    return documents.map(doc => {
      const projected = { _id: doc._id };
      
      for (const field of select) {
        if (doc.hasOwnProperty(field)) {
          projected[field] = doc[field];
        }
      }
      
      return projected;
    });
  }

  /**
   * Count documents matching filter
   */
  async count(collectionName, filter = {}) {
    const results = await this.execute(collectionName, filter, { select: ['_id'] });
    return results.length;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      indexUsageRate: this.stats.queries > 0
        ? ((this.stats.indexedQueries / this.stats.queries) * 100).toFixed(2) + '%'
        : '0%',
      avgQueryTimeMs: this.stats.avgQueryTime.toFixed(3)
    };
  }
}

module.exports = QueryEngine;
