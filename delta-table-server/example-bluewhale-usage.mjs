#!/usr/bin/env node

/**
 * BlueWhaleBronze MCP Tool Usage Examples
 * This shows exactly how to call the MCP server to create the complex schema
 */

// Example of how MCP tools would be called
function showMCPToolUsage() {
  console.log("📖 MCP Tool Usage Examples for BlueWhaleBronze Schema");
  console.log("=".repeat(70));
  
  console.log("\n🎯 Your requested path: macc/data/process/deltatables/blue-whale-bronze.delta");
  
  console.log("\n1️⃣ Create BlueWhaleBronze table with 86 columns:");
  console.log("   (Includes decimals, timestamps, arrays, and nested structures)");
  console.log(JSON.stringify({
    "tool": "create_bluewhale_bronze_table",
    "arguments": {
      "tablePath": "macc/data/process/deltatables/blue-whale-bronze.delta"
    }
  }, null, 2));
  
  console.log("\n2️⃣ Populate with realistic sample data:");
  console.log("   (Financial data, timestamps, nested ChargeAllocations, Milestones)");
  console.log(JSON.stringify({
    "tool": "populate_bluewhale_bronze_data",
    "arguments": {
      "tablePath": "macc/data/process/deltatables/blue-whale-bronze.delta"
    }
  }, null, 2));
  
  console.log("\n3️⃣ Read the data back to verify:");
  console.log(JSON.stringify({
    "tool": "read_table_data", 
    "arguments": {
      "tablePath": "macc/data/process/deltatables/blue-whale-bronze.delta"
    }
  }, null, 2));
  
  console.log("\n" + "=".repeat(70));
  console.log("📊 Schema Overview: BlueWhaleBronze");
  console.log("=".repeat(70));
  
  console.log("\n🔢 Data Types:");
  console.log("   • 57 UTF8 fields (strings like AccountId, ProductId, etc.)");
  console.log("   • 15 TIMESTAMP fields (dates like EventTimestamp, CommitmentStartDate)");  
  console.log("   • 8 DECIMAL fields (financial like CommitmentAmount with precision 32, scale 4)");
  console.log("   • 6 BOOLEAN fields (flags like IsEligible, IsTest)");
  console.log("   • 3 ARRAY fields (ChargeAllocations, BillingRecordLineItemReferences, Milestones)");
  console.log("   • 1 STRUCT field (PurchaseRecordLineItemReference)");
  console.log("   • 2 INT fields (OrderVersion as INT64, Quantity as INT32)");
  
  console.log("\n�️ Complex Nested Structures:");
  console.log("   • ChargeAllocations: Array of {id, amount, currency}");
  console.log("   • Milestones: Array of {id, name, date, amount}");  
  console.log("   • BillingRecordLineItemReferences: Array of {purchaseRecordId, lineItemId, amount}");
  console.log("   • PurchaseRecordLineItemReference: Single {purchaseRecordId, lineItemId, amount}");
  
  console.log("\n💰 Financial Fields (DECIMAL 32,4):");
  console.log("   • CommitmentAmount, TransactionAmount, OverageAmount");
  console.log("   • BalanceAdjustmentAmount, SapTransactionAmount, UnitPrice");
  console.log("   • ListUnitPrice, Units");
  
  console.log("\n⏰ Key Timestamps:");
  console.log("   • EventTimestamp, DocumentCreatedTimestamp, PurchaseTimestamp");
  console.log("   • ServicePeriodStartDate/EndDate, BillingPeriodStartDate/EndDate");
  console.log("   • CommitmentStartDate/EndDate, UpdatedTimestamp");
  
  console.log("\n🎯 Next Steps:");
  console.log("   1. Run the create_bluewhale_bronze_table tool");
  console.log("   2. Populate with sample data using populate_bluewhale_bronze_data");
  console.log("   3. Query with Spark: spark.read.format('delta').load('abfss://container@account.dfs.core.windows.net/macc/data/process/deltatables/blue-whale-bronze.delta')");
}

// Run the demo
showMCPToolUsage();