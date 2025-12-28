/**
 * GhostDB Performance Benchmark
 */

const GhostDB = require('../src/core/database');

async function benchmark() {
  console.log('⚡ GhostDB Performance Benchmark\n');

  const db = new GhostDB({
    name: 'benchmark-db',
    dataPath: './benchmark-data',
    maxMemory: 500 * 1024 * 1024,
    enableCache: true,
    enableEncryption: false,
    enableBackup: false,
    logLevel: 'error'
  });

  await db.initialize();
  db.createCollection('records', {});
  db.createIndex('records', 'key', { unique: true });

  // Benchmark 1: Insert performance
  console.log('📊 Benchmark 1: Insert Performance');
  const insertCount = 10000;
  const insertStart = Date.now();
  
  for (let i = 0; i < insertCount; i++) {
    await db.insert('records', {
      key: `key_${i}`,
      value: `value_${i}`,
      timestamp: Date.now(),
      data: { index: i, random: Math.random() }
    });
  }
  
  const insertTime = Date.now() - insertStart;
  const insertRate = Math.round(insertCount / (insertTime / 1000));
  console.log(`✅ Inserted ${insertCount} records in ${insertTime}ms`);
  console.log(`   Rate: ${insertRate} inserts/sec\n`);

  // Benchmark 2: Read by ID performance
  console.log('📊 Benchmark 2: Read by ID Performance');
  const readCount = 1000;
  const readStart = Date.now();
  
  for (let i = 0; i < readCount; i++) {
    const records = await db.find('records', {}, { limit: 1 });
    if (records.length > 0) {
      await db.findById('records', records[0].id);
    }
  }
  
  const readTime = Date.now() - readStart;
  const readRate = Math.round(readCount / (readTime / 1000));
  console.log(`✅ Read ${readCount} records in ${readTime}ms`);
  console.log(`   Rate: ${readRate} reads/sec\n`);

  // Benchmark 3: Query with index performance
  console.log('📊 Benchmark 3: Indexed Query Performance');
  const queryCount = 1000;
  const queryStart = Date.now();
  
  for (let i = 0; i < queryCount; i++) {
    await db.find('records', { key: `key_${i % insertCount}` });
  }
  
  const queryTime = Date.now() - queryStart;
  const queryRate = Math.round(queryCount / (queryTime / 1000));
  console.log(`✅ Executed ${queryCount} indexed queries in ${queryTime}ms`);
  console.log(`   Rate: ${queryRate} queries/sec\n`);

  // Benchmark 4: Update performance
  console.log('📊 Benchmark 4: Update Performance');
  const updateCount = 1000;
  const updateStart = Date.now();
  
  for (let i = 0; i < updateCount; i++) {
    await db.update('records', { key: `key_${i}` }, { updated: true });
  }
  
  const updateTime = Date.now() - updateStart;
  const updateRate = Math.round(updateCount / (updateTime / 1000));
  console.log(`✅ Updated ${updateCount} records in ${updateTime}ms`);
  console.log(`   Rate: ${updateRate} updates/sec\n`);

  // Benchmark 5: Cache performance
  console.log('📊 Benchmark 5: Cache Hit Rate');
  const cacheTestCount = 1000;
  
  // Warm up cache
  for (let i = 0; i < 50; i++) {
    await db.find('records', { key: `key_${i}` });
  }
  
  const statsBefore = db.getStats();
  
  // Test cache hits
  for (let i = 0; i < cacheTestCount; i++) {
    await db.find('records', { key: `key_${i % 50}` });
  }
  
  const statsAfter = db.getStats();
  const cacheHits = statsAfter.cacheHits - statsBefore.cacheHits;
  const cacheMisses = statsAfter.cacheMisses - statsBefore.cacheMisses;
  const hitRate = ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(2);
  
  console.log(`✅ Cache hit rate: ${hitRate}%`);
  console.log(`   Hits: ${cacheHits}, Misses: ${cacheMisses}\n`);

  // Final stats
  console.log('📈 Final Statistics:');
  const finalStats = db.getStats();
  console.log(`   Total reads: ${finalStats.reads}`);
  console.log(`   Total writes: ${finalStats.writes}`);
  console.log(`   Total queries: ${finalStats.queries}`);
  console.log(`   Memory usage: ${(finalStats.memoryUsage.used / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Cache size: ${finalStats.cacheSize}`);

  await db.shutdown();
  console.log('\n🎉 Benchmark complete!');
}

benchmark().catch(console.error);
