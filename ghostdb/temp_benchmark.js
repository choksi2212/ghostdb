
const GhostDB = require('./src/core/database');

async function runBenchmark() {
    const results = {
        sizes: [1000, 5000, 10000, 25000],
        operations: {}
    };
    
    for (const size of results.sizes) {
        console.error(`Testing ${size} records...`);
        
        const db = new GhostDB({
            name: `bench-${size}`,
            dataPath: `./bench-data-${size}`,
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

        // Insert
        const insertStart = Date.now();
        for (let i = 0; i < size; i++) {
            await db.insert('records', {
                key: `key_${i}`,
                value: `value_${i}`,
                timestamp: Date.now() + i,
                data: { index: i, random: Math.random() }
            });
        }
        const insertTime = Date.now() - insertStart;
        
        // Hash lookup
        const hashCount = Math.min(1000, size);
        const hashStart = Date.now();
        for (let i = 0; i < hashCount; i++) {
            await db.find('records', { key: `key_${Math.floor(Math.random() * size)}` });
        }
        const hashTime = Date.now() - hashStart;
        
        // Range query
        const rangeCount = 100;
        const rangeStart = Date.now();
        for (let i = 0; i < rangeCount; i++) {
            const start = Math.floor(Math.random() * size);
            await db.find('records', {
                timestamp: { $gte: Date.now() + start, $lte: Date.now() + start + 100 }
            });
        }
        const rangeTime = Date.now() - rangeStart;
        
        // Read by ID
        const allRecords = await db.find('records', {}, { limit: size });
        const readCount = Math.min(1000, size);
        const readStart = Date.now();
        for (let i = 0; i < readCount; i++) {
            const record = allRecords[Math.floor(Math.random() * allRecords.length)];
            await db.findById('records', record.id);
        }
        const readTime = Date.now() - readStart;
        
        // Update
        const updateCount = Math.min(1000, size);
        const updateStart = Date.now();
        for (let i = 0; i < updateCount; i++) {
            await db.update('records', { key: `key_${i}` }, { updated: true });
        }
        const updateTime = Date.now() - updateStart;
        
        // Delete
        const deleteCount = Math.min(100, size / 10);
        const deleteStart = Date.now();
        for (let i = 0; i < deleteCount; i++) {
            await db.delete('records', { key: `key_${i}` });
        }
        const deleteTime = Date.now() - deleteStart;
        
        // Cache test
        for (let i = 0; i < 50; i++) {
            await db.find('records', { key: `key_${i + 100}` });
        }
        const statsBefore = db.getStats();
        for (let i = 0; i < 500; i++) {
            await db.find('records', { key: `key_${(i % 50) + 100}` });
        }
        const statsAfter = db.getStats();
        const cacheHits = statsAfter.cacheHits - statsBefore.cacheHits;
        const cacheMisses = statsAfter.cacheMisses - statsBefore.cacheMisses;
        
        const stats = db.getStats();
        
        if (!results.operations[size]) results.operations[size] = {};
        results.operations[size].insert = Math.round(size / (insertTime / 1000));
        results.operations[size].hashLookup = Math.round(hashCount / (hashTime / 1000));
        results.operations[size].rangeQuery = Math.round(rangeCount / (rangeTime / 1000));
        results.operations[size].read = Math.round(readCount / (readTime / 1000));
        results.operations[size].update = Math.round(updateCount / (updateTime / 1000));
        results.operations[size].delete = Math.round(deleteCount / (deleteTime / 1000));
        results.operations[size].cacheHitRate = ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(2);
        results.operations[size].memoryMB = (stats.memoryUsage.used / 1024 / 1024).toFixed(2);
        results.operations[size].insertTime = insertTime;
        results.operations[size].hashTime = hashTime;
        results.operations[size].rangeTime = rangeTime;
        
        await db.shutdown();
    }
    
    console.log(JSON.stringify(results, null, 2));
}

runBenchmark().catch(console.error);
