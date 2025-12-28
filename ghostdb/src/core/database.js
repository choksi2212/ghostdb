/**
 * GhostDB - In-Memory Database for Ghost Key
 * High-performance, encrypted, ACID-compliant database
 */

const EventEmitter = require('events');
const MemoryEngine = require('./memory-engine');
const QueryEngine = require('./query-engine');
const IndexManager = require('../indexes/index-manager');
const TransactionManager = require('./transaction');
const CacheLayer = require('./cache');
const PersistenceEngine = require('../storage/persistence');
const BackupManager = require('../backup/backup-manager');
const Logger = require('../utils/logger');

class GhostDB extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      name: options.name || 'ghostkey',
      dataPath: options.dataPath || '~/.ghostkey/data',
      maxMemory: options.maxMemory || 512 * 1024 * 1024, // 512MB
      persistInterval: options.persistInterval || 30000, // 30 seconds
      enableCache: options.enableCache !== false,
      cacheSize: options.cacheSize || 100,
      enableEncryption: options.enableEncryption !== false,
      encryptionKey: options.encryptionKey || null,
      enableBackup: options.enableBackup !== false,
      backupInterval: options.backupInterval || 3600000, // 1 hour
      enableCompression: options.enableCompression !== false,
      logLevel: options.logLevel || 'info'
    };

    // Initialize components
    this.logger = new Logger(this.options.logLevel);
    this.memoryEngine = new MemoryEngine(this.options.maxMemory);
    this.indexManager = new IndexManager(this.memoryEngine);
    this.queryEngine = new QueryEngine(this.memoryEngine, this.indexManager);
    this.transactionManager = new TransactionManager(this.memoryEngine);
    this.cache = this.options.enableCache ? new CacheLayer(this.options.cacheSize) : null;
    this.persistence = new PersistenceEngine(this.options);
    this.backupManager = this.options.enableBackup ? new BackupManager(this.options) : null;

    // State
    this.isInitialized = false;
    this.isShuttingDown = false;
    this.stats = {
      reads: 0,
      writes: 0,
      deletes: 0,
      queries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      transactions: 0,
      backups: 0,
      startTime: Date.now()
    };

    // Collections (tables)
    this.collections = new Map();

    this.logger.info('GhostDB initialized', { options: this.options });
  }

  /**
   * Initialize database - load from disk if exists
   */
  async initialize() {
    if (this.isInitialized) {
      throw new Error('Database already initialized');
    }

    try {
      this.logger.info('Initializing GhostDB...');

      // Load persisted data
      const persistedData = await this.persistence.load();
      if (persistedData) {
        this.logger.info('Loading persisted data...');
        await this._loadPersistedData(persistedData);
      }

      // Start auto-persistence
      this._startAutoPersistence();

      // Start auto-backup
      if (this.backupManager) {
        this._startAutoBackup();
      }

      this.isInitialized = true;
      this.emit('initialized');
      this.logger.info('GhostDB initialized successfully');

      return true;
    } catch (error) {
      this.logger.error('Failed to initialize GhostDB', error);
      throw error;
    }
  }

  /**
   * Create a new collection (table)
   */
  createCollection(name, schema = {}) {
    if (this.collections.has(name)) {
      throw new Error(`Collection '${name}' already exists`);
    }

    const collection = {
      name,
      schema,
      indexes: new Map(),
      data: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.collections.set(name, collection);
    this.memoryEngine.createCollection(name, collection);

    // Create indexes if specified in schema
    if (schema.indexes) {
      schema.indexes.forEach(indexDef => {
        this.createIndex(name, indexDef.field, indexDef.options);
      });
    }

    this.logger.info(`Collection '${name}' created`);
    this.emit('collection:created', { name, schema });

    return collection;
  }

  /**
   * Get collection by name
   */
  getCollection(name) {
    const collection = this.collections.get(name);
    if (!collection) {
      throw new Error(`Collection '${name}' does not exist`);
    }
    return collection;
  }

  /**
   * Insert document into collection
   */
  async insert(collectionName, document) {
    this._ensureInitialized();

    const collection = this.getCollection(collectionName);
    
    // Validate against schema
    this._validateDocument(collection.schema, document);

    // Generate ID if not provided
    if (!document.id) {
      document.id = this._generateId();
    }
    
    // Add _id alias for internal use
    document._id = document.id;

    // Add metadata
    document._createdAt = Date.now();
    document._updatedAt = Date.now();

    // Insert into memory
    collection.data.set(document.id, document);
    collection.updatedAt = Date.now();

    // Update indexes
    this.indexManager.updateIndexes(collectionName, document, 'insert');

    // Invalidate cache
    if (this.cache) {
      this.cache.invalidate(`${collectionName}:${document.id}`);
    }

    this.stats.writes++;
    this.emit('document:inserted', { collection: collectionName, document });

    return document;
  }

  /**
   * Find documents by query
   */
  async find(collectionName, query = {}, options = {}) {
    this._ensureInitialized();

    const cacheKey = `find:${collectionName}:${JSON.stringify(query)}`;
    
    // Check cache
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
      this.stats.cacheMisses++;
    }

    const collection = this.getCollection(collectionName);
    
    // Use query engine
    const results = await this.queryEngine.execute(collectionName, query, options);

    // Cache results
    if (this.cache) {
      this.cache.set(cacheKey, results);
    }

    this.stats.reads += results.length;
    this.stats.queries++;

    return results;
  }

  /**
   * Find one document by query
   */
  async findOne(collectionName, query = {}) {
    const results = await this.find(collectionName, query, { limit: 1 });
    return results[0] || null;
  }

  /**
   * Find document by ID
   */
  async findById(collectionName, id) {
    this._ensureInitialized();

    const cacheKey = `${collectionName}:${id}`;
    
    // Check cache
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
      this.stats.cacheMisses++;
    }

    const collection = this.getCollection(collectionName);
    const document = collection.data.get(id);

    if (document && this.cache) {
      this.cache.set(cacheKey, document);
    }

    this.stats.reads++;
    return document || null;
  }

  /**
   * Update document
   */
  async update(collectionName, query, updates) {
    this._ensureInitialized();

    const documents = await this.find(collectionName, query);
    const updatedDocs = [];

    for (const doc of documents) {
      const updated = { ...doc, ...updates, _updatedAt: Date.now() };
      
      const collection = this.getCollection(collectionName);
      collection.data.set(doc.id, updated);
      collection.updatedAt = Date.now();

      // Update indexes
      this.indexManager.updateIndexes(collectionName, updated, 'update', doc);

      // Invalidate cache
      if (this.cache) {
        this.cache.invalidate(`${collectionName}:${doc.id}`);
      }

      updatedDocs.push(updated);
    }

    this.stats.writes += updatedDocs.length;
    this.emit('documents:updated', { collection: collectionName, count: updatedDocs.length });

    return updatedDocs;
  }

  /**
   * Delete documents
   */
  async delete(collectionName, query) {
    this._ensureInitialized();

    const documents = await this.find(collectionName, query);
    const collection = this.getCollection(collectionName);

    for (const doc of documents) {
      collection.data.delete(doc.id);
      
      // Update indexes
      this.indexManager.updateIndexes(collectionName, doc, 'delete');

      // Invalidate cache
      if (this.cache) {
        this.cache.invalidate(`${collectionName}:${doc.id}`);
      }
    }

    collection.updatedAt = Date.now();
    this.stats.deletes += documents.length;
    this.emit('documents:deleted', { collection: collectionName, count: documents.length });

    return documents.length;
  }

  /**
   * Create index on collection field
   */
  async createIndex(collectionName, field, options = {}) {
    const collection = this.getCollection(collectionName);
    await this.indexManager.createIndex(collectionName, field, options);
    
    this.logger.info(`Index created on ${collectionName}.${field}`);
    this.emit('index:created', { collection: collectionName, field });
  }

  /**
   * Start transaction
   */
  async beginTransaction() {
    this._ensureInitialized();
    const transaction = this.transactionManager.begin();
    this.stats.transactions++;
    return transaction;
  }

  /**
   * Get database statistics
   */
  getStats() {
    return {
      ...this.stats,
      collections: this.collections.size,
      memoryUsage: this.memoryEngine.getMemoryUsage(),
      cacheSize: this.cache ? this.cache.size() : 0,
      uptime: Date.now() - this.stats.startTime
    };
  }

  /**
   * Persist database to disk
   */
  async persist() {
    this._ensureInitialized();

    try {
      const data = this._serializeData();
      await this.persistence.save(data);
      this.emit('persisted');
      this.logger.info('Database persisted to disk');
      return true;
    } catch (error) {
      this.logger.error('Failed to persist database', error);
      throw error;
    }
  }

  /**
   * Create backup
   */
  async backup() {
    if (!this.backupManager) {
      throw new Error('Backup manager not enabled');
    }

    const data = this._serializeData();
    const backupPath = await this.backupManager.createBackup(data);
    this.stats.backups++;
    this.emit('backup:created', { path: backupPath });
    this.logger.info('Backup created', { path: backupPath });
    
    return backupPath;
  }

  /**
   * Restore from backup
   */
  async restore(backupPath) {
    if (!this.backupManager) {
      throw new Error('Backup manager not enabled');
    }

    const data = await this.backupManager.restore(backupPath);
    await this._loadPersistedData(data);
    this.emit('backup:restored', { path: backupPath });
    this.logger.info('Database restored from backup', { path: backupPath });
    
    return true;
  }

  /**
   * Shutdown database gracefully
   */
  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.info('Shutting down GhostDB...');

    // Stop auto-persistence
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
    }

    // Stop auto-backup
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    // Final persist
    await this.persist();

    // Clear memory
    this.collections.clear();
    this.memoryEngine.clear();
    if (this.cache) {
      this.cache.clear();
    }

    this.isInitialized = false;
    this.emit('shutdown');
    this.logger.info('GhostDB shutdown complete');
  }

  // Private methods

  _ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }

  _validateDocument(schema, document) {
    // Basic schema validation
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in document)) {
          throw new Error(`Required field '${field}' is missing`);
        }
      }
    }

    if (schema.fields) {
      for (const [field, type] of Object.entries(schema.fields)) {
        if (field in document && typeof document[field] !== type) {
          throw new Error(`Field '${field}' must be of type '${type}'`);
        }
      }
    }
  }

  _generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _serializeData() {
    const data = {
      version: '1.0.0',
      timestamp: Date.now(),
      collections: {}
    };

    for (const [name, collection] of this.collections) {
      data.collections[name] = {
        name: collection.name,
        schema: collection.schema,
        data: Array.from(collection.data.values()),
        indexes: Array.from(collection.indexes.keys()),
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt
      };
    }

    return data;
  }

  async _loadPersistedData(data) {
    if (!data || !data.collections) {
      return;
    }

    for (const [name, collectionData] of Object.entries(data.collections)) {
      // Create collection
      if (!this.collections.has(name)) {
        this.createCollection(name, collectionData.schema);
      }

      const collection = this.getCollection(name);

      // Load documents
      for (const doc of collectionData.data) {
        collection.data.set(doc.id, doc);
        this.indexManager.updateIndexes(name, doc, 'insert');
      }

      collection.createdAt = collectionData.createdAt;
      collection.updatedAt = collectionData.updatedAt;
    }

    this.logger.info('Persisted data loaded', { collections: Object.keys(data.collections).length });
  }

  _startAutoPersistence() {
    this.persistenceInterval = setInterval(async () => {
      try {
        await this.persist();
      } catch (error) {
        this.logger.error('Auto-persistence failed', error);
      }
    }, this.options.persistInterval);
  }

  _startAutoBackup() {
    this.backupInterval = setInterval(async () => {
      try {
        await this.backup();
      } catch (error) {
        this.logger.error('Auto-backup failed', error);
      }
    }, this.options.backupInterval);
  }
}

module.exports = GhostDB;
