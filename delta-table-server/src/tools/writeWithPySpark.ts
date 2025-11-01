import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const WriteWithPySparkArgsSchema = z.object({
  tablePath: z.string().describe('The path to the delta table (e.g., data/ingestion/DeltaTables/invoice-details.delta)'),
  records: z.array(z.record(z.any())).describe('Array of records to write'),
  storageAccount: z.string().default('maccsynapsedev').describe('Azure storage account name'),
  container: z.string().default('macc').describe('Azure storage container name'),
  deleteExisting: z.boolean().default(false).describe('Whether to delete existing files in the table first')
});

export const writeWithPySparkTool = {
  name: 'write_with_pyspark',
  description: 'Writes records to a Delta table using PySpark with explicit schema definition. This solves nested array schema issues that Apache Arrow cannot handle.',
  parameters: WriteWithPySparkArgsSchema.shape,
  handler: async (args: z.infer<typeof WriteWithPySparkArgsSchema>) => {
    const { tablePath, records, storageAccount, container, deleteExisting } = args;

    // Create a temporary Python script
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `pyspark_write_${Date.now()}.py`);
    
    // Generate Python script with embedded data
    const pythonScript = `
import sys
import json
from azure.storage.filedatalake import DataLakeServiceClient
from azure.identity import DefaultAzureCredential
from pyspark.sql import SparkSession
from pyspark.sql.types import *

# Configuration
storage_account = "${storageAccount}"
container = "${container}"
table_path = "${tablePath}"
delete_existing = ${deleteExisting ? 'True' : 'False'}

# Data to write
records_json = '''${JSON.stringify(records)}'''
records = json.loads(records_json)

print("Starting PySpark write operation...")
print(f"Target: abfss://{container}@{storage_account}.dfs.core.windows.net/{table_path}")

# Step 1: Optionally delete existing files
if delete_existing:
    try:
        credential = DefaultAzureCredential()
        service_client = DataLakeServiceClient(
            account_url=f"https://{storage_account}.dfs.core.windows.net",
            credential=credential
        )
        file_system_client = service_client.get_file_system_client(container)
        
        paths = file_system_client.get_paths(path=table_path)
        deleted_count = 0
        for path_item in paths:
            if not path_item.is_directory:
                file_client = file_system_client.get_file_client(path_item.name)
                file_client.delete_file()
                deleted_count += 1
        
        print(f"Deleted {deleted_count} existing files")
    except Exception as e:
        print(f"Note: Could not delete existing files (may not exist): {e}")

# Step 2: Initialize Spark with Delta Lake
print("Initializing Spark session...")
spark = SparkSession.builder \\
    .appName("WriteInvoiceDetailsWithSchema") \\
    .config("spark.jars.packages", "io.delta:delta-spark_2.13:4.0.0") \\
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \\
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \\
    .getOrCreate()

print("Spark session initialized")

# Step 3: Define explicit schema
charge_allocations_schema = ArrayType(
    StructType([
        StructField("chargeAmount", DoubleType(), True),
        StructField("isPaymentInstrumentTaxExempt", BooleanType(), True),
        StructField("paymentInstrumentType", StructType([
            StructField("family", StringType(), True),
            StructField("type", StringType(), True)
        ]), True),
        StructField("paymentReferences", ArrayType(StringType()), True),
        StructField("taxDetails", ArrayType(StringType()), True)
    ])
)

invoice_schema = StructType([
    StructField("AccountId", StringType(), True),
    StructField("Action", StringType(), True),
    StructField("AssetFriendlyName", StringType(), True),
    StructField("AssetId", StringType(), True),
    StructField("Availability", StringType(), True),
    StructField("AvailabilityReference", StringType(), True),
    StructField("BillingCurrencyCode", StringType(), True),
    StructField("BillingGroupId", StringType(), True),
    StructField("BillingPeriodEndDate", TimestampType(), True),
    StructField("BillingPeriodId", StringType(), True),
    StructField("BillingPeriodStartDate", TimestampType(), True),
    StructField("BillingPlanCurrency", StringType(), True),
    StructField("BillingPlanPrice", StringType(), True),
    StructField("BillingRecordLineItemReferences", StringType(), True),
    StructField("CaptureId", StringType(), True),
    StructField("CaptureVersion", StringType(), True),
    StructField("ChargeAllocations", charge_allocations_schema, True),
    StructField("ChargeType", StringType(), True),
    StructField("CompanyCode", StringType(), True),
    StructField("CompanyName", StringType(), True),
    StructField("CountryCode", StringType(), True),
    StructField("CreditDocumentDisplayNumber", StringType(), True),
    StructField("CurrencyCode", StringType(), True),
    StructField("CustomerId", StringType(), True),
    StructField("CustomerIntent", StringType(), True),
    StructField("DiscountDescriptions", StringType(), True),
    StructField("DiscountPercentage", StringType(), True),
    StructField("DisplayDescription", StringType(), True),
    StructField("DocumentCreatedDatetime", TimestampType(), True),
    StructField("DocumentReference", StringType(), True),
    StructField("DocumentState", StringType(), True),
    StructField("DocumentType", StringType(), True),
    StructField("EventDate", TimestampType(), True),
    StructField("ExchangeRate", StringType(), True),
    StructField("ExchangeRateDate", TimestampType(), True),
    StructField("ExcludedPaymentInstruments", StringType(), True),
    StructField("GroupId", StringType(), True),
    StructField("IngestionDate", TimestampType(), True),
    StructField("IngestionTimestamp", TimestampType(), True),
    StructField("InvoiceId", StringType(), True),
    StructField("InvoiceLineItemId", StringType(), True),
    StructField("IsBillImmediateDocument", StringType(), True),
    StructField("IsBillingPlan", StringType(), True),
    StructField("IsConsumption", BooleanType(), True),
    StructField("IsDuplicateRebill", BooleanType(), True),
    StructField("IsImmediateSettleDocument", StringType(), True),
    StructField("IsTelco", BooleanType(), True),
    StructField("IsThirdParty", BooleanType(), True),
    StructField("IsTrial", BooleanType(), True),
    StructField("LineItemCreatedDatetime", TimestampType(), True),
    StructField("LineItemDetails", ArrayType(StringType()), True),
    StructField("ListUnitPrice", StringType(), True),
    StructField("OrderId", StringType(), True),
    StructField("OrderSetId", StringType(), True),
    StructField("OrderVersion", StringType(), True),
    StructField("OriginalDocumentId", StringType(), True),
    StructField("PartNumber", StringType(), True),
    StructField("PricingCurrencyCode", StringType(), True),
    StructField("ProducerId", StringType(), True),
    StructField("Product", StringType(), True),
    StructField("ProductDescription", StringType(), True),
    StructField("ProductFamily", StringType(), True),
    StructField("ProductId", StringType(), True),
    StructField("ProjectId", StringType(), True),
    StructField("ProjectName", StringType(), True),
    StructField("PromotionId", StringType(), True),
    StructField("PublisherId", StringType(), True),
    StructField("PublisherName", StringType(), True),
    StructField("PurchaseRecordLineItemReference", StringType(), True),
    StructField("Quantity", IntegerType(), True),
    StructField("QuoteId", StringType(), True),
    StructField("ReasonCode", StringType(), True),
    StructField("RebillFor", StringType(), True),
    StructField("RebillForDocumentCreatedDatetime", StringType(), True),
    StructField("RecipientInfo", StringType(), True),
    StructField("ResellerMpnId", StringType(), True),
    StructField("SchemaVersion", StringType(), True),
    StructField("ServiceFamily", StringType(), True),
    StructField("ServicePeriodEndDate", TimestampType(), True),
    StructField("ServicePeriodStartDate", TimestampType(), True),
    StructField("Sku", StringType(), True),
    StructField("SkuId", StringType(), True),
    StructField("SubTotal", StringType(), True),
    StructField("TaxCalculationId", StringType(), True),
    StructField("TaxDetails", StringType(), True),
    StructField("TaxTotal", StringType(), True),
    StructField("TaxationAddress", StringType(), True),
    StructField("TermDescription", StringType(), True),
    StructField("TermEndDate", TimestampType(), True),
    StructField("TermId", StringType(), True),
    StructField("TermStartDate", TimestampType(), True),
    StructField("Total", StringType(), True),
    StructField("TotalRetailPrice", StringType(), True),
    StructField("UnitPrice", StringType(), True),
    StructField("UnitType", StringType(), True),
    StructField("Units", StringType(), True)
])

print("Schema defined")

# Step 4: Convert timestamp strings to datetime objects
from datetime import datetime

timestamp_fields = [
    'BillingPeriodEndDate', 'BillingPeriodStartDate', 'DocumentCreatedDatetime',
    'EventDate', 'ExchangeRateDate', 'IngestionDate', 'IngestionTimestamp',
    'LineItemCreatedDatetime', 'ServicePeriodEndDate', 'ServicePeriodStartDate',
    'TermEndDate', 'TermStartDate'
]

for record in records:
    for field in timestamp_fields:
        if field in record and record[field] and isinstance(record[field], str):
            # Parse ISO 8601 timestamp string
            record[field] = datetime.fromisoformat(record[field].replace('Z', '+00:00'))

print("Timestamps converted")

# Step 5: Create DataFrame with explicit schema
df = spark.createDataFrame(records, schema=invoice_schema)

print(f"DataFrame created with {df.count()} records")

# Step 6: Write to Delta table
delta_path = f"abfss://{container}@{storage_account}.dfs.core.windows.net/{table_path}"

print(f"Writing to: {delta_path}")

df.write \\
    .format("delta") \\
    .mode("append") \\
    .save(delta_path)

print("✅ Successfully wrote records to Delta table")

# Verify
verification_df = spark.read.format("delta").load(delta_path)
print(f"Verification: Table now contains {verification_df.count()} total records")

spark.stop()
print("✅ Complete")
`;

    // Write the Python script to temp file
    fs.writeFileSync(scriptPath, pythonScript);

    try {
      console.log(`Executing PySpark script: ${scriptPath}`);
      
      // Execute the Python script with environment variables
      const { stdout, stderr } = await execAsync(`python "${scriptPath}"`, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 300000, // 5 minute timeout
        env: {
          ...process.env,
          PYSPARK_PYTHON: 'python',
          PYSPARK_DRIVER_PYTHON: 'python'
        }
      });

      // Clean up temp file
      fs.unlinkSync(scriptPath);

      if (stderr && !stderr.includes('Warning')) {
        console.error('PySpark stderr:', stderr);
      }

      console.log('PySpark stdout:', stdout);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully wrote ${records.length} record(s) to Delta table using PySpark.\n\nOutput:\n${stdout}`
          }
        ]
      };
    } catch (error: any) {
      // Clean up temp file on error
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }

      throw new Error(`PySpark execution failed: ${error.message}\nStdout: ${error.stdout}\nStderr: ${error.stderr}`);
    }
  }
};
