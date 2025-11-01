#!/usr/bin/env node

/**
 * Test script for the Delta Table MCP Server
 * This script tests the MCP server functionality without requiring a full MCP client
 */

import { DeltaTableService } from './src/services/deltaTableService.js';

async function runTests() {
  console.log('🚀 Starting Delta Table MCP Server Tests...\n');
  
  const service = new DeltaTableService();
  
  try {
    // Test 1: Create Delta Table
    console.log('📋 Test 1: Creating Delta Table...');
    const createResult = await service.createDeltaTable();
    console.log('✅ Result:', createResult);
    console.log('');
    
    // Test 2: Populate with test data
    console.log('📋 Test 2: Populating with test data...');
    const populateResult = await service.populateWithTestData();
    console.log('✅ Result:', populateResult);
    console.log('');
    
    // Test 3: Read table data
    console.log('📋 Test 3: Reading table data...');
    const records = await service.readTableData();
    console.log('✅ Result:', `Found ${records.length} records:`);
    console.log(JSON.stringify(records, null, 2));
    console.log('');
    
    // Test 4: Insert additional data
    console.log('📋 Test 4: Inserting additional data...');
    const additionalRecords = [
      { id: 6, name: "Frank Miller" },
      { id: 7, name: "Grace Hopper" }
    ];
    const insertResult = await service.insertTestData(additionalRecords);
    console.log('✅ Result:', insertResult);
    console.log('');
    
    // Test 5: Read updated data
    console.log('📋 Test 5: Reading updated table data...');
    const updatedRecords = await service.readTableData();
    console.log('✅ Result:', `Found ${updatedRecords.length} records:`);
    console.log(JSON.stringify(updatedRecords, null, 2));
    console.log('');
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Only run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}