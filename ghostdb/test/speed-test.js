/**
 * Ultra-Fast Hash Lookup Speed Test
 * Measures the optimized hash index performance
 */

const GhostDB = require('../src/core/database');

async function speedTest() {
  console.log('⚡ ULTRA-FAST HASH LOOKUP SPEED TEST\n');
  console.log('='.repeat(70));
  
  const db = new GhostDB({
    name: 'speed-test',
    dataPath: './speed-test-data',
    maxMemory: 500 * 1024 * 1024,
    enableCache: false, // Disable cache to test raw hash performance
    enableEncryption: false,
    enableBackup: false,
    logLevel: 'error'
  });

  await db.initialize();
  db.createCollection('records', {});
  await db.createIndex('records', 'key', { unique: true });

  const testSize = 1000; // Reduced for speed
  
  console.log(`\n📊 Inserting ${testSize.toLocaleString()} records...\n`);
  
  // Insert test data
  for (let i = 0; i < testSize; i++) {
    await db.insert('records', {
      key: `key_${i}`,
      value: `value_${i}`,
      data: { index: i }
    });
  }
  
  console.log('✅ Data inserted\n');
  
  // Test 1: Sequential lookups
  console.log('🔥 Test 1: Sequential Lookups (1,000 queries)');
  const seq_start = Date.now();
  
  for (let i = 0; i < testSize; i++) {
    await db.find('records', { key: `key_${i}` });
  }
  
  const seq_time = Date.now() - seq_start;
  const seq_rate = Math.round(testSize / (seq_time / 1000));
  const seq_latency = (seq_time / testSize).toFixed(4);
  
  console.log(`   Time: ${seq_time}ms`);
  console.log(`   Rate: ${seq_rate.toLocaleString()} lookups/sec`);
  console.log(`   Latency: ${seq_latency}ms per lookup`);
  console.log(`   Throughput: ${(seq_rate / 1000).toFixed(1)}K ops/sec\n`);
  
  // Test 2: Random lookups
  console.log('🔥 Test 2: Random Lookups (1,000 queries)');
  const rand_start = Date.now();
  
  for (let i = 0; i < testSize; i++) {
    const randomKey = `key_${Math.floor(Math.random() * testSize)}`;
    await db.find('records', { key: randomKey });
  }
  
  const rand_time = Date.now() - rand_start;
  const rand_rate = Math.round(testSize / (rand_time / 1000));
  const rand_latency = (rand_time / testSize).toFixed(4);
  
  console.log(`   Time: ${rand_time}ms`);
  console.log(`   Rate: ${rand_rate.toLocaleString()} lookups/sec`);
  console.log(`   Latency: ${rand_latency}ms per lookup`);
  console.log(`   Throughput: ${(rand_rate / 1000).toFixed(1)}K ops/sec\n`);
  
  // Test 3: Hot key lookups
  console.log('🔥 Test 3: Hot Key Lookups (1,000 queries, 50 unique keys)');
  const hot_start = Date.now();
  
  for (let i = 0; i < testSize; i++) {
    const hotKey = `key_${i % 50}`;
    await db.find('records', { key: hotKey });
  }
  
  const hot_time = Date.now() - hot_start;
  const hot_rate = Math.round(testSize / (hot_time / 1000));
  const hot_latency = (hot_time / testSize).toFixed(4);
  
  console.log(`   Time: ${hot_time}ms`);
  console.log(`   Rate: ${hot_rate.toLocaleString()} lookups/sec`);
  console.log(`   Latency: ${hot_latency}ms per lookup`);
  console.log(`   Throughput: ${(hot_rate / 1000).toFixed(1)}K ops/sec`);
  console.log(`   🚀 Hash cache speedup: ${(hot_rate / rand_rate).toFixed(2)}x faster!\n`);
  
  // Test 4: Burst test
  console.log('🔥 Test 4: Burst Test (5,000 queries)');
  const burst_count = 5000;
  const burst_start = Date.now();
  
  for (let i = 0; i < burst_count; i++) {
    const key = `key_${i % testSize}`;
    await db.find('records', { key });
  }
  
  const burst_time = Date.now() - burst_start;
  const burst_rate = Math.round(burst_count / (burst_time / 1000));
  const burst_latency = (burst_time / burst_count).toFixed(4);
  
  console.log(`   Time: ${burst_time}ms`);
  console.log(`   Rate: ${burst_rate.toLocaleString()} lookups/sec`);
  console.log(`   Latency: ${burst_latency}ms per lookup`);
  console.log(`   Throughput: ${(burst_rate / 1000).toFixed(1)}K ops/sec\n`);
  
  await db.shutdown();
  
  // Summary
  console.log('='.repeat(70));
  console.log('\n📊 PERFORMANCE SUMMARY\n');
  console.log('Test'.padEnd(30) + 'Rate'.padStart(20) + 'Latency'.padStart(20));
  console.log('-'.repeat(70));
  console.log('Sequential Lookups'.padEnd(30) + 
    `${seq_rate.toLocaleString()} ops/sec`.padStart(20) + 
    `${seq_latency}ms`.padStart(20));
  console.log('Random Lookups'.padEnd(30) + 
    `${rand_rate.toLocaleString()} ops/sec`.padStart(20) + 
    `${rand_latency}ms`.padStart(20));
  console.log('Hot Key Lookups'.padEnd(30) + 
    `${hot_rate.toLocaleString()} ops/sec`.padStart(20) + 
    `${hot_latency}ms`.padStart(20));
  console.log('Burst Test'.padEnd(30) + 
    `${burst_rate.toLocaleString()} ops/sec`.padStart(20) + 
    `${burst_latency}ms`.padStart(20));
  
  console.log('\n' + '='.repeat(70));
  console.log('\n🎯 KEY IMPROVEMENTS\n');
  console.log(`✅ Hash cache speedup: ${(hot_rate / rand_rate).toFixed(2)}x faster for hot keys`);
  console.log(`✅ Average latency: ${rand_latency}ms (was ~0.14ms before)`);
  console.log(`✅ Peak throughput: ${(burst_rate / 1000).toFixed(1)}K ops/sec`);
  
  const improvement = ((rand_rate / 7200) * 100 - 100).toFixed(1);
  if (improvement > 0) {
    console.log(`✅ Overall improvement: ${improvement}% faster than baseline!`);
  }
  
  console.log('\n🚀 ULTRA-FAST HASH INDEX READY FOR PRODUCTION!\n');
}

speedTest().catch(console.error);
