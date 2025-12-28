/**
 * Comprehensive GhostDB Performance Benchmark
 * Tests various scenarios and data sizes
 */

const GhostDB = require('../src/core/database');

async function comprehensiveBenchmark() {
  console.log('⚡ GhostDB COMPREHENSIVE PERFORMANCE BENCHMARK\n');
  console.log('='.repeat(70));
  
  // Test different data sizes
  const testSizes = [1000, 5000, 10000, 50000];
  const results = {};
  
  for (const size of testSizes) {
    console.log(`\n📊 Testing with ${size.toLocaleString()} records\n`);
    
    const db = new GhostDB({
      name: `benchmark-${size}`,
      dataPath: `./benchmark-data-${size}`,
      maxMemory: 500 * 1024 * 1024,
      enableCache: true,
      enableEncryption: false,
      enableBackup: false,
      logLevel: 'error'
    });

    await db.initialize();
    db.createCollection('records', {});
    await db.createIndex('records', 'key', { unique: true });
    await db.createIndex('records', 'timestamp', { type: 'btree' });

    results[size] = {};

    // 1. INSERT PERFORMANCE
    console.log('  1️⃣  Insert Performance');
    const insertStart = Date.now();
    
    for (let i = 0; i < size; i++) {
      await db.insert('records', {
        key: `key_${i}`,
        value: `value_${i}`,
        timestamp: Date.now() + i,
        data: { 
          index: i, 
          random: Math.random(),
          text: 'Sample data for testing performance'
        }
      });
    }
    
    const insertTime = Date.now() - insertStart;
    const insertRate = Math.round(size / (insertTime / 1000));
    results[size].insertRate = insertRate;
    results[size].insertTime = insertTime;
    console.log(`     ✅ ${size.toLocaleString()} inserts in ${insertTime}ms`);
    console.log(`     📈 Rate: ${insertRate.toLocaleString()} inserts/sec\n`);

    // 2. INDEXED LOOKUP (HASH) PERFORMANCE
    console.log('  2️⃣  Indexed Lookup (Hash - Equality)');
    const hashLookupCount = Math.min(1000, size);
    const hashStart = Date.now();
    
    for (let i = 0; i < hashLookupCount; i++) {
      const randomKey = `key_${Math.floor(Math.random() * size)}`;
      await db.find('records', { key: randomKey });
    }
    
    const hashTime = Date.now() - hashStart;
    const hashRate = Math.round(hashLookupCount / (hashTime / 1000));
    results[size].hashLookupRate = hashRate;
    console.log(`     ✅ ${hashLookupCount} lookups in ${hashTime}ms`);
    console.log(`     📈 Rate: ${hashRate.toLocaleString()} lookups/sec\n`);

    // 3. RANGE QUERY (B+ TREE) PERFORMANCE
    console.log('  3️⃣  Range Query (B+ Tree)');
    const rangeQueryCount = 100;
    const rangeStart = Date.now();
    
    for (let i = 0; i < rangeQueryCount; i++) {
      const start = Math.floor(Math.random() * size);
      const end = start + 100;
      await db.find('records', {
        timestamp: {
          $gte: Date.now() + start,
          $lte: Date.now() + end
        }
      });
    }
    
    const rangeTime = Date.now() - rangeStart;
    const rangeRate = Math.round(rangeQueryCount / (rangeTime / 1000));
    results[size].rangeQueryRate = rangeRate;
    console.log(`     ✅ ${rangeQueryCount} range queries in ${rangeTime}ms`);
    console.log(`     📈 Rate: ${rangeRate.toLocaleString()} queries/sec\n`);

    // 4. READ BY ID PERFORMANCE
    console.log('  4️⃣  Read by ID');
    const readCount = Math.min(1000, size);
    const allRecords = await db.find('records', {}, { limit: size });
    const readStart = Date.now();
    
    for (let i = 0; i < readCount; i++) {
      const randomRecord = allRecords[Math.floor(Math.random() * allRecords.length)];
      await db.findById('records', randomRecord.id);
    }
    
    const readTime = Date.now() - readStart;
    const readRate = Math.round(readCount / (readTime / 1000));
    results[size].readRate = readRate;
    console.log(`     ✅ ${readCount} reads in ${readTime}ms`);
    console.log(`     📈 Rate: ${readRate.toLocaleString()} reads/sec\n`);

    // 5. UPDATE PERFORMANCE
    console.log('  5️⃣  Update Performance');
    const updateCount = Math.min(1000, size);
    const updateStart = Date.now();
    
    for (let i = 0; i < updateCount; i++) {
      await db.update('records', 
        { key: `key_${i}` }, 
        { updated: true, updateTime: Date.now() }
      );
    }
    
    const updateTime = Date.now() - updateStart;
    const updateRate = Math.round(updateCount / (updateTime / 1000));
    results[size].updateRate = updateRate;
    console.log(`     ✅ ${updateCount} updates in ${updateTime}ms`);
    console.log(`     📈 Rate: ${updateRate.toLocaleString()} updates/sec\n`);

    // 6. DELETE PERFORMANCE
    console.log('  6️⃣  Delete Performance');
    const deleteCount = Math.min(100, size / 10);
    const deleteStart = Date.now();
    
    for (let i = 0; i < deleteCount; i++) {
      await db.delete('records', { key: `key_${i}` });
    }
    
    const deleteTime = Date.now() - deleteStart;
    const deleteRate = Math.round(deleteCount / (deleteTime / 1000));
    results[size].deleteRate = deleteRate;
    console.log(`     ✅ ${deleteCount} deletes in ${deleteTime}ms`);
    console.log(`     📈 Rate: ${deleteRate.toLocaleString()} deletes/sec\n`);

    // 7. CACHE PERFORMANCE
    console.log('  7️⃣  Cache Hit Rate');
    const cacheTestCount = 500;
    
    // Warm up cache
    for (let i = 0; i < 50; i++) {
      await db.find('records', { key: `key_${i + 100}` });
    }
    
    const statsBefore = db.getStats();
    
    // Test cache hits
    for (let i = 0; i < cacheTestCount; i++) {
      await db.find('records', { key: `key_${(i % 50) + 100}` });
    }
    
    const statsAfter = db.getStats();
    const cacheHits = statsAfter.cacheHits - statsBefore.cacheHits;
    const cacheMisses = statsAfter.cacheMisses - statsBefore.cacheMisses;
    const hitRate = ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(2);
    results[size].cacheHitRate = parseFloat(hitRate);
    
    console.log(`     ✅ Cache hit rate: ${hitRate}%`);
    console.log(`     📊 Hits: ${cacheHits}, Misses: ${cacheMisses}\n`);

    // 8. MEMORY USAGE
    const stats = db.getStats();
    results[size].memoryMB = (stats.memoryUsage.used / 1024 / 1024).toFixed(2);
    console.log(`  8️⃣  Memory Usage: ${results[size].memoryMB} MB\n`);

    await db.shutdown();
  }

  // SUMMARY TABLE
  console.log('\n' + '='.repeat(70));
  console.log('📊 PERFORMANCE SUMMARY TABLE\n');
  console.log('Operation'.padEnd(25) + testSizes.map(s => `${(s/1000)}K`.padStart(12)).join(''));
  console.log('-'.repeat(70));
  
  console.log('Insert (ops/sec)'.padEnd(25) + 
    testSizes.map(s => results[s].insertRate.toLocaleString().padStart(12)).join(''));
  
  console.log('Hash Lookup (ops/sec)'.padEnd(25) + 
    testSizes.map(s => results[s].hashLookupRate.toLocaleString().padStart(12)).join(''));
  
  console.log('Range Query (ops/sec)'.padEnd(25) + 
    testSizes.map(s => results[s].rangeQueryRate.toLocaleString().padStart(12)).join(''));
  
  console.log('Read by ID (ops/sec)'.padEnd(25) + 
    testSizes.map(s => results[s].readRate.toLocaleString().padStart(12)).join(''));
  
  console.log('Update (ops/sec)'.padEnd(25) + 
    testSizes.map(s => results[s].updateRate.toLocaleString().padStart(12)).join(''));
  
  console.log('Delete (ops/sec)'.padEnd(25) + 
    testSizes.map(s => results[s].deleteRate.toLocaleString().padStart(12)).join(''));
  
  console.log('Cache Hit Rate (%)'.padEnd(25) + 
    testSizes.map(s => `${results[s].cacheHitRate}%`.padStart(12)).join(''));
  
  console.log('Memory Usage (MB)'.padEnd(25) + 
    testSizes.map(s => results[s].memoryMB.padStart(12)).join(''));

  console.log('\n' + '='.repeat(70));
  console.log('\n🎉 Comprehensive benchmark complete!\n');

  // COMPARISON WITH OTHER DATABASES
  console.log('📊 COMPARISON WITH OTHER DATABASES\n');
  console.log('Database'.padEnd(20) + 'Insert/sec'.padStart(15) + 'Lookup/sec'.padStart(15));
  console.log('-'.repeat(50));
  console.log('GhostDB (Ours)'.padEnd(20) + 
    results[10000].insertRate.toLocaleString().padStart(15) + 
    results[10000].hashLookupRate.toLocaleString().padStart(15));
  console.log('Redis (in-memory)'.padEnd(20) + '~100,000'.padStart(15) + '~100,000'.padStart(15));
  console.log('MongoDB (disk)'.padEnd(20) + '~10,000'.padStart(15) + '~20,000'.padStart(15));
  console.log('SQLite (disk)'.padEnd(20) + '~5,000'.padStart(15) + '~10,000'.padStart(15));
  console.log('LocalStorage'.padEnd(20) + '~100'.padStart(15) + '~1,000'.padStart(15));
  
  console.log('\n💡 Note: GhostDB is optimized for browser/Node.js environments');
  console.log('   Redis is a dedicated server, MongoDB/SQLite use disk I/O\n');
}

comprehensiveBenchmark().catch(console.error);
