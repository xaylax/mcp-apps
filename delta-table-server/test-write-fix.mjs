/**
 * Test script to verify the parquet write functionality is fixed
 */

import { DeltaTableService } from './dist/services/deltaTableService.js';

async function testSimpleWrite() {
  console.log('\n=== TEST 1: Simple Schema ===');
  
  const service = new DeltaTableService();
  const simpleRecords = [
    { id: 1, name: 'Test User 1', amount: 100.50, active: true },
    { id: 2, name: 'Test User 2', amount: 200.75, active: false }
  ];
  
  try {
    const result = await service.writeToTable('test-tables/simple-test', simpleRecords);
    console.log('✅ Success:', result);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function testComplexWrite() {
  console.log('\n=== TEST 2: Complex Nested Schema ===');
  
  const service = new DeltaTableService();
  const complexRecords = [
    {
      id: 'INV-001',
      customer: 'Customer A',
      timestamp: '2025-10-26T12:00:00Z',
      items: [
        { sku: 'ITEM-1', quantity: 2, price: 10.50 },
        { sku: 'ITEM-2', quantity: 1, price: 25.00 }
      ],
      metadata: {
        source: 'web',
        region: 'US'
      }
    },
    {
      id: 'INV-002',
      customer: 'Customer B',
      timestamp: '2025-10-26T13:00:00Z',
      items: [
        { sku: 'ITEM-3', quantity: 5, price: 5.00 }
      ],
      metadata: {
        source: 'mobile',
        region: 'EU'
      }
    }
  ];
  
  try {
    const result = await service.writeToTable('test-tables/complex-test', complexRecords);
    console.log('✅ Success:', result);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function testEmptyArrays() {
  console.log('\n=== TEST 3: Empty Arrays ===');
  
  const service = new DeltaTableService();
  const recordsWithEmptyArrays = [
    {
      id: 'TEST-001',
      name: 'Test with empty array',
      tags: [],
      items: []
    },
    {
      id: 'TEST-002',
      name: 'Test with populated array',
      tags: ['tag1', 'tag2'],
      items: [{ id: 1, value: 'test' }]
    }
  ];
  
  try {
    const result = await service.writeToTable('test-tables/empty-arrays-test', recordsWithEmptyArrays);
    console.log('✅ Success:', result);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function testInconsistentSchema() {
  console.log('\n=== TEST 4: Inconsistent Schema (Should Fail) ===');
  
  const service = new DeltaTableService();
  const inconsistentRecords = [
    { id: 1, name: 'Record 1', amount: 100 },
    { id: 2, name: 'Record 2', price: 200 } // Different field name
  ];
  
  try {
    const result = await service.writeToTable('test-tables/inconsistent-test', inconsistentRecords);
    console.log('❌ Should have failed but succeeded:', result);
  } catch (error) {
    console.log('✅ Expected failure:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Testing Delta Table Parquet Write Functionality\n');
  console.log('=' .repeat(60));
  
  await testSimpleWrite();
  await testComplexWrite();
  await testEmptyArrays();
  await testInconsistentSchema();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!\n');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
