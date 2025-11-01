#!/usr/bin/env node

/**
 * Direct test of delta table functionality
 * This simulates exactly what the MCP tools would do
 */

const { MockDeltaTableService } = require('./dist/services/mockDeltaTableService.js');

async function createDeltaTableDemo() {
  console.log('🎯 Delta Table Creation Demo');
  console.log('============================\n');
  
  const service = new MockDeltaTableService();
  
  try {
    // Step 1: Create the delta table with id and name fields
    console.log('📋 Step 1: Creating delta table with id and name fields...');
    const createResult = await service.createDeltaTable();
    console.log('✅ Result:', createResult);
    console.log('');
    
    // Step 2: Add the default test data (5 sample records)
    console.log('📋 Step 2: Adding default test data (5 sample records)...');
    const populateResult = await service.populateWithTestData();
    console.log('✅ Result:', populateResult);
    console.log('');
    
    // Step 3: Show all records to verify it worked
    console.log('📋 Step 3: Reading all records to verify...');
    const allRecords = await service.readTableData();
    console.log('✅ Result: Successfully retrieved', allRecords.length, 'records:');
    console.log('');
    
    console.log('📊 All Records in Delta Table:');
    console.log('==============================');
    allRecords.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}, Name: "${record.name}"`);
    });
    
    console.log('');
    console.log('🎉 Delta table creation and verification completed successfully!');
    console.log('');
    console.log('📍 Table Location: abfss://macc@maccsynapsedev.dfs.core.windows.net/data/ingestion/DeltaTables/test.delta');
    console.log('📋 Schema: id (int), name (string)');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

createDeltaTableDemo().catch(console.error);