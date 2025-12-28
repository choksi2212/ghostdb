/**
 * GhostDB Test Suite
 */

const GhostDB = require('../src/core/database');

async function runTests() {
  console.log('🧪 Starting GhostDB Tests...\n');

  const db = new GhostDB({
    name: 'test-db',
    dataPath: './test-data',
    maxMemory: 100 * 1024 * 1024,
    enableCache: true,
    enableEncryption: false,
    enableBackup: false,
    logLevel: 'error'
  });

  try {
    // Test 1: Initialize
    console.log('Test 1: Initialize database');
    await db.initialize();
    console.log('✅ Database initialized\n');

    // Test 2: Create collection
    console.log('Test 2: Create collection');
    db.createCollection('users', {
      fields: {
        username: 'string',
        email: 'string',
        age: 'number'
      },
      required: ['username', 'email']
    });
    console.log('✅ Collection created\n');

    // Test 3: Insert documents
    console.log('Test 3: Insert documents');
    const user1 = await db.insert('users', {
      username: 'alice',
      email: 'alice@example.com',
      age: 25
    });
    const user2 = await db.insert('users', {
      username: 'bob',
      email: 'bob@example.com',
      age: 30
    });
    const user3 = await db.insert('users', {
      username: 'charlie',
      email: 'charlie@example.com',
      age: 25
    });
    console.log(`✅ Inserted 3 users (IDs: ${user1.id}, ${user2.id}, ${user3.id})\n`);

    // Test 4: Find by ID
    console.log('Test 4: Find by ID');
    const foundUser = await db.findById('users', user1.id);
    console.log(`✅ Found user: ${foundUser.username}\n`);

    // Test 5: Find with query
    console.log('Test 5: Find with query');
    const age25Users = await db.find('users', { age: 25 });
    console.log(`✅ Found ${age25Users.length} users with age 25\n`);

    // Test 6: Update documents
    console.log('Test 6: Update documents');
    await db.update('users', { username: 'alice' }, { age: 26 });
    const updatedUser = await db.findById('users', user1.id);
    console.log(`✅ Updated alice's age to ${updatedUser.age}\n`);

    // Test 7: Create index
    console.log('Test 7: Create index');
    await db.createIndex('users', 'username', { unique: true });
    console.log('✅ Index created on username\n');

    // Test 8: Query with index
    console.log('Test 8: Query with index');
    const bobUser = await db.findOne('users', { username: 'bob' });
    console.log(`✅ Found user via index: ${bobUser.username}\n`);

    // Test 9: Delete documents
    console.log('Test 9: Delete documents');
    const deletedCount = await db.delete('users', { username: 'charlie' });
    console.log(`✅ Deleted ${deletedCount} user(s)\n`);

    // Test 10: Statistics
    console.log('Test 10: Get statistics');
    const stats = db.getStats();
    console.log(`✅ Stats: ${stats.reads} reads, ${stats.writes} writes, ${stats.deletes} deletes\n`);

    // Test 11: Persistence
    console.log('Test 11: Persist to disk');
    await db.persist();
    console.log('✅ Database persisted\n');

    // Test 12: Shutdown
    console.log('Test 12: Shutdown database');
    await db.shutdown();
    console.log('✅ Database shutdown\n');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
