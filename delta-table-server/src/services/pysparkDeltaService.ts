import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

export interface TestRecord {
  [key: string]: any;
}

export class PySparkDeltaService {
  private accountName: string;
  private containerName: string;

  constructor() {
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "maccsynapsedev";
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "macc";
  }

  /**
   * Infer PySpark schema from JavaScript record
   */
  private inferPySparkSchema(record: any, fieldName: string = "root", indent: number = 0): string {
    const indentStr = "    ".repeat(indent);
    
    if (Array.isArray(record)) {
      if (record.length === 0) {
        return `ArrayType(StringType(), True)`;
      }
      const elementSchema = this.inferPySparkSchema(record[0], fieldName, indent);
      return `ArrayType(${elementSchema}, True)`;
    } else if (typeof record === "object" && record !== null && !(record instanceof Date)) {
      // It's a struct
      const fields: string[] = [];
      for (const [key, value] of Object.entries(record)) {
        const fieldType = this.inferPySparkType(value, key, indent + 1);
        fields.push(`${indentStr}    StructField("${key}", ${fieldType}, True)`);
      }
      return `StructType([\n${fields.join(",\n")}\n${indentStr}])`;
    } else {
      return this.inferPySparkType(record, fieldName, indent);
    }
  }

  private inferPySparkType(value: any, fieldName: string = "field", indent: number = 0): string {
    const indentStr = "    ".repeat(indent);
    
    if (value === null || value === undefined) {
      return "StringType()";
    } else if (typeof value === "string") {
      // Check if it's a timestamp string
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return "TimestampType()";
      }
      return "StringType()";
    } else if (typeof value === "number") {
      if (Number.isInteger(value)) {
        return "IntegerType()";
      } else {
        return "DoubleType()";
      }
    } else if (typeof value === "boolean") {
      return "BooleanType()";
    } else if (value instanceof Date) {
      return "TimestampType()";
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        return "ArrayType(StringType(), True)";
      }
      const elementType = this.inferPySparkSchema(value[0], fieldName, indent + 1);
      return `ArrayType(${elementType}, True)`;
    } else if (typeof value === "object" && value !== null) {
      // Nested struct
      const fields: string[] = [];
      for (const [key, val] of Object.entries(value)) {
        const fieldType = this.inferPySparkType(val, key, indent + 1);
        fields.push(`${indentStr}    StructField("${key}", ${fieldType}, True)`);
      }
      return `StructType([\n${fields.join(",\n")}\n${indentStr}])`;
    } else {
      return "StringType()";
    }
  }

  /**
   * Generate PySpark schema definition from sample record
   */
  private generateSchemaDefinition(sampleRecord: TestRecord): string {
    const fields: string[] = [];
    
    for (const [key, value] of Object.entries(sampleRecord)) {
      const fieldType = this.inferPySparkType(value, key, 1);
      fields.push(`    StructField("${key}", ${fieldType}, True)`);
    }

    return `schema = StructType([\n${fields.join(",\n")}\n])`;
  }

  /**
   * Convert JavaScript value to Python literal
   */
  private toPythonLiteral(value: any): string {
    if (value === null || value === undefined) {
      return "None";
    } else if (typeof value === "string") {
      // Escape quotes and backslashes
      const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `"${escaped}"`;
    } else if (typeof value === "number") {
      return value.toString();
    } else if (typeof value === "boolean") {
      return value ? "True" : "False";
    } else if (Array.isArray(value)) {
      const elements = value.map(v => this.toPythonLiteral(v));
      return `[${elements.join(", ")}]`;
    } else if (typeof value === "object") {
      // Convert to Python dict
      const pairs = Object.entries(value).map(([k, v]) => 
        `"${k}": ${this.toPythonLiteral(v)}`
      );
      return `{${pairs.join(", ")}}`;
    } else {
      return "None";
    }
  }

  /**
   * Generate PySpark data rows from records
   */
  private generateDataRows(records: TestRecord[]): string {
    const rows = records.map(record => {
      const values = Object.values(record).map(v => this.toPythonLiteral(v));
      return `    (${values.join(", ")})`;
    });

    return `data = [\n${rows.join(",\n")}\n]`;
  }

  async writeToTable(tablePath: string, records: TestRecord[]): Promise<string> {
    if (records.length === 0) {
      throw new Error("Cannot write empty records array");
    }

    const fullPath = `abfss://${this.containerName}@${this.accountName}.dfs.core.windows.net/${tablePath}`;
    const sampleRecord = records[0];

    // Generate PySpark script
    const schemaDefinition = this.generateSchemaDefinition(sampleRecord);
    const dataRows = this.generateDataRows(records);

    const pysparkScript = `
from pyspark.sql import SparkSession
from pyspark.sql.types import *
from datetime import datetime

# Initialize Spark
spark = SparkSession.builder.appName("DeltaTableWriter").getOrCreate()

# Define schema
${schemaDefinition}

# Define data
${dataRows}

# Create DataFrame
df = spark.createDataFrame(data, schema)

# Write to Delta table (append mode)
df.write.format("delta").mode("append").save("${fullPath}")

print(f"Successfully wrote {len(data)} records to {fullPath}")
`;

    // Write script to temporary file
    const tempScriptPath = path.join(process.cwd(), `pyspark_write_${uuidv4()}.py`);
    fs.writeFileSync(tempScriptPath, pysparkScript);

    try {
      // Execute PySpark script
      const { stdout, stderr } = await execAsync(
        `spark-submit ${tempScriptPath}`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      // Clean up temp file
      fs.unlinkSync(tempScriptPath);

      if (stderr && !stderr.includes("WARN")) {
        console.warn("PySpark warnings:", stderr);
      }

      return `Successfully wrote ${records.length} records to delta table at ${tablePath}`;
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
      throw new Error(`Failed to execute PySpark script: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async readFromTable(tablePath: string): Promise<TestRecord[]> {
    const fullPath = `abfss://${this.containerName}@${this.accountName}.dfs.core.windows.net/${tablePath}`;

    const pysparkScript = `
from pyspark.sql import SparkSession
import json

# Initialize Spark
spark = SparkSession.builder.appName("DeltaTableReader").getOrCreate()

# Read Delta table
df = spark.read.format("delta").load("${fullPath}")

# Convert to JSON and print
records = df.toJSON().collect()
for record in records:
    print(record)
`;

    const tempScriptPath = path.join(process.cwd(), `pyspark_read_${uuidv4()}.py`);
    fs.writeFileSync(tempScriptPath, pysparkScript);

    try {
      const { stdout, stderr } = await execAsync(
        `spark-submit ${tempScriptPath}`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      // Clean up temp file
      fs.unlinkSync(tempScriptPath);

      // Parse JSON records from stdout
      const lines = stdout.trim().split("\n").filter(line => line.startsWith("{"));
      const records = lines.map(line => JSON.parse(line));

      return records;
    } catch (error) {
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
      throw new Error(`Failed to read delta table: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
