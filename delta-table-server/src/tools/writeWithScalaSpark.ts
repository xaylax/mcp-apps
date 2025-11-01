import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const WriteWithScalaSparkArgsSchema = z.object({
  tablePath: z.string().describe('The path to the delta table (e.g., data/ingestion/DeltaTables/invoice-details.delta)'),
  records: z.array(z.record(z.any())).describe('Array of records to write'),
  storageAccount: z.string().default('maccsynapsedev').describe('Azure storage account name'),
  container: z.string().default('macc').describe('Azure storage container name'),
  deleteExisting: z.boolean().default(false).describe('Whether to delete existing files in the table first')
});

export const writeWithScalaSparkTool = {
  name: 'write_with_scala_spark',
  description: 'Writes records to a Delta table using Scala Spark with explicit schema definition. Uses native Spark Scala API to avoid Python worker issues.',
  parameters: WriteWithScalaSparkArgsSchema.shape,
  handler: async (args: z.infer<typeof WriteWithScalaSparkArgsSchema>) => {
    const { tablePath, records, storageAccount, container, deleteExisting } = args;

    // Create a temporary Scala script
    const tempDir = os.tmpdir();
    const scalaScriptPath = path.join(tempDir, `spark_write_${Date.now()}.scala`);
    const jsonDataPath = path.join(tempDir, `data_${Date.now()}.json`);
    
    // Write JSON data to temp file
    fs.writeFileSync(jsonDataPath, JSON.stringify(records, null, 2));

    // Generate Scala Spark script
    const scalaScript = `
import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.types._
import org.apache.spark.sql.functions._
import org.apache.spark.sql.Row
import scala.collection.JavaConverters._

object DeltaWriter {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("WriteInvoiceDetailsScala")
      .master("local[*]")
      .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
      .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
      .getOrCreate()

    import spark.implicits._

    println("Spark session initialized")

    val storageAccount = "${storageAccount}"
    val container = "${container}"
    val tablePath = "${tablePath}"
    val deltaPath = s"abfss://\${container}@\${storageAccount}.dfs.core.windows.net/\${tablePath}"

    println(s"Target: \${deltaPath}")

    // Read JSON data
    val jsonData = scala.io.Source.fromFile("${jsonDataPath.replace(/\\/g, '/')}").mkString
    
    // Define schema
    val chargeAllocationsSchema = ArrayType(
      StructType(Seq(
        StructField("chargeAmount", DoubleType, nullable = true),
        StructField("isPaymentInstrumentTaxExempt", BooleanType, nullable = true),
        StructField("paymentInstrumentType", StructType(Seq(
          StructField("family", StringType, nullable = true),
          StructField("type", StringType, nullable = true)
        )), nullable = true),
        StructField("paymentReferences", ArrayType(StringType), nullable = true),
        StructField("taxDetails", ArrayType(StringType), nullable = true)
      ))
    )

    val invoiceSchema = StructType(Seq(
      StructField("AccountId", StringType, nullable = true),
      StructField("Action", StringType, nullable = true),
      StructField("AssetFriendlyName", StringType, nullable = true),
      StructField("AssetId", StringType, nullable = true),
      StructField("Availability", StringType, nullable = true),
      StructField("AvailabilityReference", StringType, nullable = true),
      StructField("BillingCurrencyCode", StringType, nullable = true),
      StructField("BillingGroupId", StringType, nullable = true),
      StructField("BillingPeriodEndDate", TimestampType, nullable = true),
      StructField("BillingPeriodId", StringType, nullable = true),
      StructField("BillingPeriodStartDate", TimestampType, nullable = true),
      StructField("BillingPlanCurrency", StringType, nullable = true),
      StructField("BillingPlanPrice", StringType, nullable = true),
      StructField("BillingRecordLineItemReferences", StringType, nullable = true),
      StructField("CaptureId", StringType, nullable = true),
      StructField("CaptureVersion", StringType, nullable = true),
      StructField("ChargeAllocations", chargeAllocationsSchema, nullable = true),
      StructField("ChargeType", StringType, nullable = true),
      StructField("CompanyCode", StringType, nullable = true),
      StructField("CompanyName", StringType, nullable = true),
      StructField("CountryCode", StringType, nullable = true),
      StructField("CreditDocumentDisplayNumber", StringType, nullable = true),
      StructField("CurrencyCode", StringType, nullable = true),
      StructField("CustomerId", StringType, nullable = true),
      StructField("CustomerIntent", StringType, nullable = true),
      StructField("DiscountDescriptions", StringType, nullable = true),
      StructField("DiscountPercentage", StringType, nullable = true),
      StructField("DisplayDescription", StringType, nullable = true),
      StructField("DocumentCreatedDatetime", TimestampType, nullable = true),
      StructField("DocumentReference", StringType, nullable = true),
      StructField("DocumentState", StringType, nullable = true),
      StructField("DocumentType", StringType, nullable = true),
      StructField("EventDate", TimestampType, nullable = true),
      StructField("ExchangeRate", StringType, nullable = true),
      StructField("ExchangeRateDate", TimestampType, nullable = true),
      StructField("ExcludedPaymentInstruments", StringType, nullable = true),
      StructField("GroupId", StringType, nullable = true),
      StructField("IngestionDate", TimestampType, nullable = true),
      StructField("IngestionTimestamp", TimestampType, nullable = true),
      StructField("InvoiceId", StringType, nullable = true),
      StructField("InvoiceLineItemId", StringType, nullable = true),
      StructField("IsBillImmediateDocument", StringType, nullable = true),
      StructField("IsBillingPlan", StringType, nullable = true),
      StructField("IsConsumption", BooleanType, nullable = true),
      StructField("IsDuplicateRebill", BooleanType, nullable = true),
      StructField("IsImmediateSettleDocument", StringType, nullable = true),
      StructField("IsTelco", BooleanType, nullable = true),
      StructField("IsThirdParty", BooleanType, nullable = true),
      StructField("IsTrial", BooleanType, nullable = true),
      StructField("LineItemCreatedDatetime", TimestampType, nullable = true),
      StructField("LineItemDetails", ArrayType(StringType), nullable = true),
      StructField("ListUnitPrice", StringType, nullable = true),
      StructField("OrderId", StringType, nullable = true),
      StructField("OrderSetId", StringType, nullable = true),
      StructField("OrderVersion", StringType, nullable = true),
      StructField("OriginalDocumentId", StringType, nullable = true),
      StructField("PartNumber", StringType, nullable = true),
      StructField("PricingCurrencyCode", StringType, nullable = true),
      StructField("ProducerId", StringType, nullable = true),
      StructField("Product", StringType, nullable = true),
      StructField("ProductDescription", StringType, nullable = true),
      StructField("ProductFamily", StringType, nullable = true),
      StructField("ProductId", StringType, nullable = true),
      StructField("ProjectId", StringType, nullable = true),
      StructField("ProjectName", StringType, nullable = true),
      StructField("PromotionId", StringType, nullable = true),
      StructField("PublisherId", StringType, nullable = true),
      StructField("PublisherName", StringType, nullable = true),
      StructField("PurchaseRecordLineItemReference", StringType, nullable = true),
      StructField("Quantity", IntegerType, nullable = true),
      StructField("QuoteId", StringType, nullable = true),
      StructField("ReasonCode", StringType, nullable = true),
      StructField("RebillFor", StringType, nullable = true),
      StructField("RebillForDocumentCreatedDatetime", StringType, nullable = true),
      StructField("RecipientInfo", StringType, nullable = true),
      StructField("ResellerMpnId", StringType, nullable = true),
      StructField("SchemaVersion", StringType, nullable = true),
      StructField("ServiceFamily", StringType, nullable = true),
      StructField("ServicePeriodEndDate", TimestampType, nullable = true),
      StructField("ServicePeriodStartDate", TimestampType, nullable = true),
      StructField("Sku", StringType, nullable = true),
      StructField("SkuId", StringType, nullable = true),
      StructField("SubTotal", StringType, nullable = true),
      StructField("TaxCalculationId", StringType, nullable = true),
      StructField("TaxDetails", StringType, nullable = true),
      StructField("TaxTotal", StringType, nullable = true),
      StructField("TaxationAddress", StringType, nullable = true),
      StructField("TermDescription", StringType, nullable = true),
      StructField("TermEndDate", TimestampType, nullable = true),
      StructField("TermId", StringType, nullable = true),
      StructField("TermStartDate", TimestampType, nullable = true),
      StructField("Total", StringType, nullable = true),
      StructField("TotalRetailPrice", StringType, nullable = true),
      StructField("UnitPrice", StringType, nullable = true),
      StructField("UnitType", StringType, nullable = true),
      StructField("Units", StringType, nullable = true)
    ))

    println("Schema defined")

    // Read JSON with schema
    val df = spark.read.schema(invoiceSchema).json(Seq(jsonData).toDS())

    println(s"DataFrame created with \${df.count()} records")
    
    // Write to Delta
    println(s"Writing to: \${deltaPath}")
    
    df.write
      .format("delta")
      .mode("append")
      .save(deltaPath)

    println("✅ Successfully wrote records to Delta table")

    // Verify
    val verificationDf = spark.read.format("delta").load(deltaPath)
    println(s"Verification: Table now contains \${verificationDf.count()} total records")

    spark.stop()
    println("✅ Complete")
  }
}
`;

    // Write the Scala script to temp file
    fs.writeFileSync(scalaScriptPath, scalaScript);

    try {
      console.log(`Executing Scala Spark script: ${scalaScriptPath}`);
      
      // Execute using spark-shell in batch mode
      const { stdout, stderr } = await execAsync(`spark-shell -i "${scalaScriptPath}"`, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 300000, // 5 minute timeout
        env: {
          ...process.env,
          SPARK_SUBMIT_OPTS: '--conf spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension --conf spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog'
        }
      });

      // Clean up temp files
      fs.unlinkSync(scalaScriptPath);
      fs.unlinkSync(jsonDataPath);

      if (stderr && !stderr.includes('Warning') && !stderr.includes('WARN')) {
        console.error('Spark stderr:', stderr);
      }

      console.log('Spark stdout:', stdout);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully wrote ${records.length} record(s) to Delta table using Scala Spark.\n\nOutput:\n${stdout}`
          }
        ]
      };
    } catch (error: any) {
      // Clean up temp files on error
      if (fs.existsSync(scalaScriptPath)) {
        fs.unlinkSync(scalaScriptPath);
      }
      if (fs.existsSync(jsonDataPath)) {
        fs.unlinkSync(jsonDataPath);
      }

      throw new Error(`Scala Spark execution failed: ${error.message}\nStdout: ${error.stdout}\nStderr: ${error.stderr}`);
    }
  }
};
