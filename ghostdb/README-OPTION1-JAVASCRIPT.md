# 🗄️ GhostDB - Option 1: Pure JavaScript Implementation

**Complete Guide to Building a High-Performance In-Memory Biometric Database**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Prerequisites](#prerequisites)
4. [Project Structure](#project-structure)
5. [Installation & Setup](#installation--setup)
6. [Core Components](#core-components)
7. [Implementation Guide](#implementation-guide)
8. [API Reference](#api-reference)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Performance Optimization](#performance-optimization)
12. [Security](#security)
13. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### What is GhostDB?

GhostDB is a **lightweight, high-performance, in-memory database** specifically designed for storing and managing biometric authentication data for the Ghost Key browser extension. Built entirely in JavaScript/Node.js, it provides:

- ⚡ **Lightning-fast queries** (sub-millisecond response times)
- 🔒 **Military-grade encryption** (AES-256-GCM)
- 💾 **Unlimited storage** (limited only by system RAM)
- 🔄 **ACID transactions** (Atomicity, Consistency, Isolation, Durability)
- 📊 **Advanced indexing** (Hash tables, B+ trees, Bloom filters)
- 🛡️ **Built-in security** (Encryption at rest, access control)

### Why Pure JavaScript?


| Advantage | Description |
|-----------|-------------|
| **Easy Development** | No compilation, immediate testing |
| **Cross-Platform** | Works on Windows, macOS, Linux |
| **Maintainable** | Single language for entire stack |
| **Fast Iteration** | Quick prototyping and debugging |
| **Library Ecosystem** | Access to npm packages |
| **No Build Tools** | Simple deployment process |

### Performance Expectations

| Operation | Target Performance |
|-----------|-------------------|
| Insert | < 1ms per record |
| Query by ID | < 0.1ms |
| Indexed Query | < 1ms |
| Full Scan (1000 records) | < 10ms |
| Transaction Commit | < 5ms |
| Database Startup | < 50ms |
| Memory Usage | ~50MB per 1000 profiles |

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Ghost Key Extension                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Extension UI (popup.js, content.js)               │    │
│  │  - Profile Management                              │    │
│  │  - Authentication Flow                             │    │
│  └──────────────────┬─────────────────────────────────┘    │
│                     │                                        │
│  ┌──────────────────▼─────────────────────────────────┐    │
│  │  GhostDB Client Library (ghostdb-client.js)        │    │
│  │  - Connection Manager                              │    │
│  │  - Query Builder                                   │    │
│  │  - Cache Layer                                     │    │
│  └──────────────────┬─────────────────────────────────┘    │
└────────────────────┼──────────────────────────────────────┘
                     │
                     │ Native Messaging API
                     │ (Chrome ↔ Node.js)
                     │
┌────────────────────▼──────────────────────────────────────┐
│              GhostDB Server (Node.js)                      │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Native Messaging Host (native-host.js)          │    │
│  │  - Message Handler                               │    │
│  │  - Connection Manager                            │    │
│  └──────────────────┬───────────────────────────────┘    │
│                     │                                      │
│  ┌──────────────────▼───────────────────────────────┐    │
│  │  Database Core (database.js)                     │    │
│  │  - Query Engine                                  │    │
│  │  - Transaction Manager                           │    │
│  │  - Schema Validator                              │    │
│  └──────────────────┬───────────────────────────────┘    │
│                     │                                      │
│  ┌──────────────────▼───────────────────────────────┐    │
│  │  Storage Engine (storage-engine.js)              │    │
│  │  - In-Memory Store (Map/Object)                  │    │
│  │  - Index Manager                                 │    │
│  │  - Memory Pool                                   │    │
│  └──────────────────┬───────────────────────────────┘    │
│                     │                                      │
│  ┌──────────────────▼───────────────────────────────┐    │
│  │  Encryption Layer (encryption.js)                │    │
│  │  - AES-256-GCM Encryption                        │    │
│  │  - PBKDF2 Key Derivation                         │    │
│  │  - HMAC Integrity Checks                         │    │
│  └──────────────────┬───────────────────────────────┘    │
│                     │                                      │
│  ┌──────────────────▼───────────────────────────────┐    │
│  │  Persistence Layer (persistence/)                │    │
│  │  - Write-Ahead Log (wal.js)                      │    │
│  │  - Snapshot Manager (snapshot.js)                │    │
│  │  - Recovery System (recovery.js)                 │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```


### Data Flow Diagram

```
User Action (Extension)
    ↓
GhostDB Client
    ↓
Native Messaging (JSON over stdio)
    ↓
Native Host (Node.js Process)
    ↓
Query Parser & Validator
    ↓
Transaction Manager (if needed)
    ↓
Storage Engine
    ├─→ Primary Index (Hash Table) → O(1) lookup
    ├─→ Secondary Index (B+ Tree) → O(log n) lookup
    └─→ Bloom Filter → Fast existence check
    ↓
Encryption Layer (if enabled)
    ↓
In-Memory Data Store
    ↓
Persistence Layer (async)
    ├─→ Write-Ahead Log (WAL)
    └─→ Snapshot (periodic)
    ↓
Response back to Extension
```

---

## 🔧 Prerequisites

### Required Software

1. **Node.js** (v14.0.0 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`
   - Why: Runtime for GhostDB server

2. **npm** (v6.0.0 or higher)
   - Comes with Node.js
   - Verify: `npm --version`
   - Why: Package manager

3. **Git** (optional, for version control)
   - Download: https://git-scm.com/
   - Verify: `git --version`

4. **Chrome Browser** (v88 or higher)
   - Download: https://www.google.com/chrome/
   - Why: For testing the extension

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **RAM** | 512 MB available | 2 GB available |
| **Disk Space** | 100 MB | 500 MB |
| **CPU** | Dual-core 1.5 GHz | Quad-core 2.5 GHz |
| **OS** | Windows 10, macOS 10.14, Linux (kernel 4.0+) | Latest versions |

### Knowledge Prerequisites

- **JavaScript**: ES6+ features (async/await, classes, modules)
- **Node.js**: File system, streams, child processes
- **Chrome Extensions**: Manifest V3, native messaging
- **Data Structures**: Hash tables, trees, graphs
- **Cryptography**: Basic understanding of encryption

---

## 📁 Project Structure

### Complete Directory Layout

```
ghostdb/
├── package.json                    # Project metadata & dependencies
├── package-lock.json               # Locked dependency versions
├── .gitignore                      # Git ignore rules
├── .eslintrc.json                  # ESLint configuration
├── .prettierrc                     # Prettier configuration
├── README.md                       # This file
├── LICENSE                         # MIT License
│
├── src/                            # Source code
│   ├── index.js                    # Main entry point
│   │
│   ├── core/                       # Core database components
│   │   ├── database.js             # Main Database class
│   │   ├── storage-engine.js       # In-memory storage
│   │   ├── query-engine.js         # Query processor
│   │   ├── transaction.js          # Transaction manager
│   │   ├── schema.js               # Schema definitions
│   │   └── validator.js            # Data validation
│   │
│   ├── indexes/                    # Indexing structures
│   │   ├── hash-index.js           # Primary hash index
│   │   ├── btree-index.js          # B+ tree secondary index
│   │   ├── bloom-filter.js         # Bloom filter
│   │   └── index-manager.js        # Index coordinator
│   │
│   ├── encryption/                 # Encryption layer
│   │   ├── encryption.js           # Main encryption class
│   │   ├── aes-gcm.js              # AES-256-GCM implementation
│   │   ├── pbkdf2.js               # Key derivation
│   │   ├── hmac.js                 # HMAC integrity
│   │   └── key-manager.js          # Key storage & rotation
│   │
│   ├── persistence/                # Persistence layer
│   │   ├── wal.js                  # Write-ahead log
│   │   ├── snapshot.js             # Snapshot manager
│   │   ├── recovery.js             # Recovery system
│   │   └── compression.js          # Data compression
│   │
│   ├── server/                     # Native messaging server
│   │   ├── native-host.js          # Native messaging host
│   │   ├── message-handler.js      # Message processor
│   │   ├── connection-manager.js   # Connection pool
│   │   └── protocol.js             # Message protocol
│   │
│   ├── client/                     # Client library (for extension)
│   │   ├── ghostdb-client.js       # Main client class
│   │   ├── connection.js           # Connection handler
│   │   ├── query-builder.js        # Query builder API
│   │   └── cache.js                # Client-side cache
│   │
│   └── utils/                      # Utility functions
│       ├── logger.js               # Logging system
│       ├── errors.js               # Custom error classes
│       ├── helpers.js              # Helper functions
│       └── constants.js            # Constants & config
│
├── native-manifest/                # Chrome native messaging
│   ├── com.ghostkey.ghostdb.json   # Native host manifest
│   ├── install.js                  # Installation script
│   └── uninstall.js                # Uninstallation script
│
├── tests/                          # Test suite
│   ├── unit/                       # Unit tests
│   │   ├── database.test.js
│   │   ├── storage-engine.test.js
│   │   ├── query-engine.test.js
│   │   ├── encryption.test.js
│   │   └── indexes.test.js
│   │
│   ├── integration/                # Integration tests
│   │   ├── end-to-end.test.js
│   │   ├── persistence.test.js
│   │   └── native-messaging.test.js
│   │
│   ├── performance/                # Performance tests
│   │   ├── benchmark.js
│   │   └── stress-test.js
│   │
│   └── fixtures/                   # Test data
│       ├── sample-profiles.json
│       └── sample-models.json
│
├── scripts/                        # Build & utility scripts
│   ├── build.js                    # Build script
│   ├── dev.js                      # Development server
│   ├── install-native.js           # Native host installer
│   └── generate-keys.js            # Key generation utility
│
├── docs/                           # Documentation
│   ├── API.md                      # API documentation
│   ├── ARCHITECTURE.md             # Architecture details
│   ├── SECURITY.md                 # Security guidelines
│   └── CONTRIBUTING.md             # Contribution guide
│
├── examples/                       # Example code
│   ├── basic-usage.js              # Basic usage example
│   ├── transactions.js             # Transaction example
│   ├── encryption.js               # Encryption example
│   └── extension-integration.js    # Extension integration
│
└── dist/                           # Built files (generated)
    ├── ghostdb-server.js           # Bundled server
    ├── ghostdb-client.js           # Bundled client
    └── native-host/                # Native host files
        ├── ghostdb-host.js
        └── manifest.json
```


---

## 🚀 Installation & Setup

### Step 1: Initialize Project

```bash
# Create project directory
mkdir ghostdb
cd ghostdb

# Initialize npm project
npm init -y

# Update package.json with project details
```

**package.json:**
```json
{
  "name": "ghostdb",
  "version": "1.0.0",
  "description": "High-performance in-memory database for biometric data",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:watch": "npm test -- --watch",
    "test:coverage": "npm test -- --coverage",
    "build": "node scripts/build.js",
    "install-native": "node scripts/install-native.js",
    "uninstall-native": "node scripts/uninstall-native.js",
    "lint": "eslint src/**/*.js",
    "format": "prettier --write src/**/*.js"
  },
  "keywords": [
    "database",
    "in-memory",
    "biometric",
    "encryption",
    "ghost-key"
  ],
  "author": "Ghost Key Team",
  "license": "MIT",
  "engines": {
    "node": ">=14.0.0",
    "npm": ">=6.0.0"
  },
  "dependencies": {},
  "devDependencies": {
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "nodemon": "^3.0.0",
    "jest": "^29.0.0"
  }
}
```

### Step 2: Install Dependencies

```bash
# Install development dependencies
npm install --save-dev eslint prettier nodemon jest

# No runtime dependencies (zero-dependency design)
```

### Step 3: Create Directory Structure

```bash
# Create all directories
mkdir -p src/{core,indexes,encryption,persistence,server,client,utils}
mkdir -p native-manifest
mkdir -p tests/{unit,integration,performance,fixtures}
mkdir -p scripts
mkdir -p docs
mkdir -p examples
mkdir -p dist
```

### Step 4: Configure ESLint

**.eslintrc.json:**
```json
{
  "env": {
    "node": true,
    "es2021": true,
    "jest": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module"
  },
  "rules": {
    "no-console": "off",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Step 5: Configure Prettier

**.prettierrc:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### Step 6: Create .gitignore

**.gitignore:**
```
# Dependencies
node_modules/
package-lock.json

# Build output
dist/
*.log

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Database files
*.ghostdb
*.wal
*.snapshot

# Test coverage
coverage/

# Temporary files
tmp/
temp/
```

---

## 🔨 Core Components Implementation

### Component 1: Database Core (src/core/database.js)

**Purpose**: Main database class that coordinates all operations

**Key Responsibilities**:
- Initialize storage engine
- Manage collections
- Handle queries
- Coordinate transactions
- Manage connections

**Implementation Structure**:
```javascript
/**
 * Main Database Class
 * 
 * @class GhostDB
 * @description High-performance in-memory database for biometric data
 */
class GhostDB {
  constructor(options = {}) {
    // Configuration
    this.config = {
      dataDir: options.dataDir || './data',
      maxMemory: options.maxMemory || 1024 * 1024 * 1024, // 1GB
      encryption: options.encryption !== false,
      persistence: options.persistence !== false,
      autoSnapshot: options.autoSnapshot !== false,
      snapshotInterval: options.snapshotInterval || 3600000, // 1 hour
      walEnabled: options.walEnabled !== false,
      ...options
    };

    // Core components
    this.storageEngine = null;
    this.queryEngine = null;
    this.transactionManager = null;
    this.encryptionLayer = null;
    this.persistenceLayer = null;
    
    // State
    this.isInitialized = false;
    this.collections = new Map();
    this.indexes = new Map();
    this.connections = new Set();
    
    // Statistics
    this.stats = {
      queries: 0,
      inserts: 0,
      updates: 0,
      deletes: 0,
      transactions: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  /**
   * Initialize database
   */
  async initialize() {
    // 1. Initialize storage engine
    // 2. Load encryption keys
    // 3. Initialize indexes
    // 4. Load persisted data
    // 5. Start background tasks
  }

  /**
   * Create a new collection
   */
  async createCollection(name, schema) {
    // Validate collection name
    // Validate schema
    // Create storage space
    // Create indexes
    // Register collection
  }

  /**
   * Insert document
   */
  async insert(collection, document) {
    // Validate document
    // Generate ID if needed
    // Encrypt if enabled
    // Store in memory
    // Update indexes
    // Write to WAL
    // Return inserted document
  }

  /**
   * Query documents
   */
  async query(collection, filter, options) {
    // Parse filter
    // Use indexes if possible
    // Filter results
    // Apply sorting
    // Apply pagination
    // Decrypt if needed
    // Return results
  }

  /**
   * Update document
   */
  async update(collection, filter, update) {
    // Find documents
    // Apply updates
    // Validate updated documents
    // Update indexes
    // Write to WAL
    // Return update count
  }

  /**
   * Delete document
   */
  async delete(collection, filter) {
    // Find documents
    // Remove from storage
    // Update indexes
    // Write to WAL
    // Return delete count
  }

  /**
   * Begin transaction
   */
  async beginTransaction() {
    // Create transaction context
    // Return transaction object
  }

  /**
   * Shutdown database
   */
  async shutdown() {
    // Stop background tasks
    // Flush WAL
    // Create final snapshot
    // Close connections
    // Clean up resources
  }
}

export default GhostDB;
```

**Key Methods to Implement**:
1. `initialize()` - Set up all components
2. `createCollection()` - Define new data collection
3. `insert()` - Add new documents
4. `query()` - Search documents
5. `update()` - Modify documents
6. `delete()` - Remove documents
7. `beginTransaction()` - Start ACID transaction
8. `shutdown()` - Graceful shutdown


### Component 2: Storage Engine (src/core/storage-engine.js)

**Purpose**: Manage in-memory data storage with high performance

**Data Structures**:
```javascript
/**
 * Storage Engine
 * Uses multiple data structures for optimal performance
 */
class StorageEngine {
  constructor(options = {}) {
    // Primary storage: Map for O(1) access
    this.collections = new Map();
    
    // Memory management
    this.memoryPool = new MemoryPool(options.maxMemory);
    this.memoryUsage = 0;
    
    // Configuration
    this.config = options;
  }

  /**
   * Store document
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @param {object} document - Document data
   */
  set(collection, id, document) {
    // Get or create collection
    if (!this.collections.has(collection)) {
      this.collections.set(collection, new Map());
    }
    
    const coll = this.collections.get(collection);
    
    // Calculate memory usage
    const size = this.calculateSize(document);
    
    // Check memory limit
    if (this.memoryUsage + size > this.config.maxMemory) {
      throw new Error('Memory limit exceeded');
    }
    
    // Store document
    coll.set(id, {
      data: document,
      size: size,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    this.memoryUsage += size;
  }

  /**
   * Retrieve document
   */
  get(collection, id) {
    const coll = this.collections.get(collection);
    if (!coll) return null;
    
    const doc = coll.get(id);
    return doc ? doc.data : null;
  }

  /**
   * Delete document
   */
  delete(collection, id) {
    const coll = this.collections.get(collection);
    if (!coll) return false;
    
    const doc = coll.get(id);
    if (!doc) return false;
    
    this.memoryUsage -= doc.size;
    return coll.delete(id);
  }

  /**
   * Get all documents in collection
   */
  getAll(collection) {
    const coll = this.collections.get(collection);
    if (!coll) return [];
    
    return Array.from(coll.values()).map(doc => doc.data);
  }

  /**
   * Calculate document size in bytes
   */
  calculateSize(document) {
    return JSON.stringify(document).length * 2; // UTF-16
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      memoryUsage: this.memoryUsage,
      maxMemory: this.config.maxMemory,
      utilizationPercent: (this.memoryUsage / this.config.maxMemory) * 100,
      collections: this.collections.size,
      totalDocuments: Array.from(this.collections.values())
        .reduce((sum, coll) => sum + coll.size, 0)
    };
  }
}

export default StorageEngine;
```

### Component 3: Query Engine (src/core/query-engine.js)

**Purpose**: Process queries efficiently using indexes

**Query Types Supported**:
- Equality: `{ field: value }`
- Comparison: `{ field: { $gt: value, $lt: value } }`
- Logical: `{ $and: [...], $or: [...], $not: {...} }`
- Array: `{ field: { $in: [...], $nin: [...] } }`
- Existence: `{ field: { $exists: true } }`
- Regex: `{ field: { $regex: /pattern/ } }`

```javascript
/**
 * Query Engine
 * Processes queries and uses indexes for optimization
 */
class QueryEngine {
  constructor(storageEngine, indexManager) {
    this.storage = storageEngine;
    this.indexes = indexManager;
  }

  /**
   * Execute query
   * @param {string} collection - Collection name
   * @param {object} filter - Query filter
   * @param {object} options - Query options (sort, limit, skip)
   */
  async execute(collection, filter = {}, options = {}) {
    // 1. Analyze query to find best index
    const queryPlan = this.analyzeQuery(collection, filter);
    
    // 2. Get candidate documents
    let documents = await this.getCandidates(collection, queryPlan);
    
    // 3. Apply filter
    documents = this.applyFilter(documents, filter);
    
    // 4. Apply sorting
    if (options.sort) {
      documents = this.applySort(documents, options.sort);
    }
    
    // 5. Apply pagination
    if (options.skip) {
      documents = documents.slice(options.skip);
    }
    if (options.limit) {
      documents = documents.slice(0, options.limit);
    }
    
    // 6. Apply projection
    if (options.select) {
      documents = this.applyProjection(documents, options.select);
    }
    
    return documents;
  }

  /**
   * Analyze query to determine best execution plan
   */
  analyzeQuery(collection, filter) {
    // Check if we can use an index
    const indexableFields = Object.keys(filter).filter(field => {
      return this.indexes.hasIndex(collection, field);
    });
    
    if (indexableFields.length > 0) {
      // Use index for first indexable field
      return {
        type: 'index',
        field: indexableFields[0],
        value: filter[indexableFields[0]]
      };
    }
    
    // Fall back to full collection scan
    return { type: 'scan' };
  }

  /**
   * Get candidate documents based on query plan
   */
  async getCandidates(collection, queryPlan) {
    if (queryPlan.type === 'index') {
      // Use index
      const ids = await this.indexes.lookup(
        collection,
        queryPlan.field,
        queryPlan.value
      );
      return ids.map(id => this.storage.get(collection, id));
    } else {
      // Full scan
      return this.storage.getAll(collection);
    }
  }

  /**
   * Apply filter to documents
   */
  applyFilter(documents, filter) {
    return documents.filter(doc => this.matchesFilter(doc, filter));
  }

  /**
   * Check if document matches filter
   */
  matchesFilter(document, filter) {
    for (const [key, value] of Object.entries(filter)) {
      // Handle operators
      if (key.startsWith('$')) {
        if (!this.evaluateOperator(document, key, value)) {
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
   * Evaluate query operator
   */
  evaluateOperator(document, operator, value) {
    switch (operator) {
      case '$and':
        return value.every(filter => this.matchesFilter(document, filter));
      case '$or':
        return value.some(filter => this.matchesFilter(document, filter));
      case '$not':
        return !this.matchesFilter(document, value);
      default:
        return true;
    }
  }

  /**
   * Apply sorting
   */
  applySort(documents, sort) {
    return documents.sort((a, b) => {
      for (const [field, direction] of Object.entries(sort)) {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal < bVal) return direction === 1 ? -1 : 1;
        if (aVal > bVal) return direction === 1 ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Apply projection (select specific fields)
   */
  applyProjection(documents, select) {
    return documents.map(doc => {
      const projected = {};
      for (const field of select) {
        if (doc.hasOwnProperty(field)) {
          projected[field] = doc[field];
        }
      }
      return projected;
    });
  }
}

export default QueryEngine;
```


---

## 🔌 Native Messaging Setup

### Step 1: Create Native Host Manifest

**native-manifest/com.ghostkey.ghostdb.json:**
```json
{
  "name": "com.ghostkey.ghostdb",
  "description": "GhostDB Native Messaging Host",
  "path": "/absolute/path/to/ghostdb-host.js",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://YOUR_EXTENSION_ID/"
  ]
}
```

### Step 2: Install Native Host

**scripts/install-native.js:**
```javascript
import fs from 'fs';
import path from 'path';
import os from 'os';

const MANIFEST_NAME = 'com.ghostkey.ghostdb.json';

function getManifestPath() {
  const platform = os.platform();
  const home = os.homedir();
  
  if (platform === 'win32') {
    return path.join(home, 'AppData', 'Local', 'Google', 'Chrome', 
      'User Data', 'NativeMessagingHosts', MANIFEST_NAME);
  } else if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 
      'Google', 'Chrome', 'NativeMessagingHosts', MANIFEST_NAME);
  } else {
    return path.join(home, '.config', 'google-chrome', 
      'NativeMessagingHosts', MANIFEST_NAME);
  }
}

async function install() {
  const manifestPath = getManifestPath();
  const manifestDir = path.dirname(manifestPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }
  
  // Read manifest template
  const template = JSON.parse(
    fs.readFileSync('./native-manifest/com.ghostkey.ghostdb.json', 'utf8')
  );
  
  // Update path to absolute
  template.path = path.resolve('./dist/native-host/ghostdb-host.js');
  
  // Write manifest
  fs.writeFileSync(manifestPath, JSON.stringify(template, null, 2));
  
  console.log('✅ Native host installed successfully!');
  console.log('📍 Manifest location:', manifestPath);
}

install().catch(console.error);
```

### Step 3: Create Native Host Server

**src/server/native-host.js:**
```javascript
#!/usr/bin/env node

import GhostDB from '../core/database.js';
import { readMessage, sendMessage } from './protocol.js';

// Initialize database
const db = new GhostDB({
  dataDir: './data',
  maxMemory: 1024 * 1024 * 1024, // 1GB
  encryption: true,
  persistence: true
});

await db.initialize();

// Message handler
async function handleMessage(message) {
  try {
    const { id, type, collection, data, filter, options } = message;
    
    let result;
    
    switch (type) {
      case 'insert':
        result = await db.insert(collection, data);
        break;
        
      case 'query':
        result = await db.query(collection, filter, options);
        break;
        
      case 'update':
        result = await db.update(collection, filter, data);
        break;
        
      case 'delete':
        result = await db.delete(collection, filter);
        break;
        
      case 'transaction':
        result = await handleTransaction(data);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    return {
      id,
      status: 'success',
      data: result
    };
  } catch (error) {
    return {
      id: message.id,
      status: 'error',
      error: {
        message: error.message,
        stack: error.stack
      }
    };
  }
}

// Main loop
async function main() {
  while (true) {
    try {
      const message = await readMessage();
      const response = await handleMessage(message);
      await sendMessage(response);
    } catch (error) {
      if (error.message === 'EOF') {
        break; // Extension closed
      }
      console.error('Error:', error);
    }
  }
  
  // Cleanup
  await db.shutdown();
}

main().catch(console.error);
```

---

## 📚 API Reference

### Database Class

#### `new GhostDB(options)`
Create new database instance.

**Options:**
- `dataDir` (string): Data directory path
- `maxMemory` (number): Maximum memory in bytes
- `encryption` (boolean): Enable encryption
- `persistence` (boolean): Enable persistence

**Example:**
```javascript
const db = new GhostDB({
  dataDir: './data',
  maxMemory: 1024 * 1024 * 1024,
  encryption: true
});
```

#### `await db.initialize()`
Initialize database and load persisted data.

#### `await db.createCollection(name, schema)`
Create new collection.

**Parameters:**
- `name` (string): Collection name
- `schema` (object): Schema definition

#### `await db.insert(collection, document)`
Insert document into collection.

**Returns:** Document ID (string)

#### `await db.query(collection, filter, options)`
Query documents.

**Filter Operators:**
- `$eq`: Equal
- `$ne`: Not equal
- `$gt`: Greater than
- `$gte`: Greater than or equal
- `$lt`: Less than
- `$lte`: Less than or equal
- `$in`: In array
- `$nin`: Not in array
- `$and`: Logical AND
- `$or`: Logical OR
- `$not`: Logical NOT

**Example:**
```javascript
const results = await db.query('profiles', {
  userId: 'user123',
  createdAt: { $gte: '2025-01-01' }
}, {
  sort: { createdAt: -1 },
  limit: 10
});
```

---

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/database.test.js

# Run with coverage
npm run test:coverage
```

### Performance Benchmarks

```bash
# Run benchmarks
node tests/performance/benchmark.js
```

**Expected Results:**
```
Insert (1000 docs):     5ms    (200,000 ops/sec)
Query by ID (1000):     0.5ms  (2,000,000 ops/sec)
Indexed Query (1000):   2ms    (500,000 ops/sec)
Full Scan (10000):      15ms   (666,666 ops/sec)
Transaction (100 ops):  8ms    (12,500 tx/sec)
```

---

## 🚀 Deployment

### Build for Production

```bash
# Build optimized bundle
npm run build

# Install native host
npm run install-native

# Verify installation
node scripts/verify-install.js
```

### Extension Integration

**In manifest.json:**
```json
{
  "permissions": ["nativeMessaging"],
  "background": {
    "service_worker": "background.js"
  }
}
```

**In extension code:**
```javascript
import GhostDBClient from './libs/ghostdb-client.js';

const db = new GhostDBClient({
  host: 'com.ghostkey.ghostdb'
});

await db.connect();

// Use database
const profileId = await db.insert('profiles', {
  name: 'Work Account',
  userId: 'user123'
});
```

---

## ⚡ Performance Optimization

### Memory Optimization
1. Use object pooling for frequently created objects
2. Implement LRU cache for hot data
3. Use typed arrays for binary data
4. Minimize object allocations in hot paths

### Query Optimization
1. Always use indexes for large collections
2. Limit result sets with pagination
3. Use projection to select only needed fields
4. Cache frequently accessed data

### Persistence Optimization
1. Batch WAL writes
2. Use compression for snapshots
3. Implement incremental snapshots
4. Use memory-mapped files for large data

---

## 🔒 Security Best Practices

1. **Encryption Keys**: Store in OS keychain, never in code
2. **Input Validation**: Validate all user input
3. **Access Control**: Implement per-collection permissions
4. **Audit Logging**: Log all database operations
5. **Regular Backups**: Automated encrypted backups
6. **Security Updates**: Keep dependencies updated

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: Native host not connecting
**Solution**: Check manifest path and permissions

**Issue**: Out of memory errors
**Solution**: Increase `maxMemory` or implement eviction

**Issue**: Slow queries
**Solution**: Add indexes on frequently queried fields

**Issue**: Data corruption
**Solution**: Enable WAL and regular snapshots

---

## 📞 Support

- **Email**: manaschoksiwork@gmail.com
- **GitHub**: https://github.com/ghostkey/ghostdb
- **Documentation**: https://ghostdb.dev/docs

---

**Made with ❤️ by the Ghost Key Team**
