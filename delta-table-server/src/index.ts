#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { writeToTableTool } from "./tools/writeToTable.js";
import { readFromTableTool } from "./tools/readFromTable.js";
import { writeWithPySparkTool } from "./tools/writeWithPySpark.js";
import { writeWithScalaSparkTool } from "./tools/writeWithScalaSpark.js";
import { writeInvoiceDetailsWithSchemaTool } from "./tools/writeInvoiceDetailsWithSchema.js";
import { writeWithDeltaLakeTool } from "./tools/writeWithDeltaLake.js";
import { createDeltaTableTool } from "./tools/createDeltaTable.js";

// Create server instance
const server = new McpServer({
  name: "delta-table-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register simplified tools
server.tool(
  writeToTableTool.name,
  writeToTableTool.description,
  writeToTableTool.parameters,
  writeToTableTool.handler
);

server.tool(
  readFromTableTool.name,
  readFromTableTool.description,
  readFromTableTool.parameters,
  readFromTableTool.handler
);

server.tool(
  writeWithPySparkTool.name,
  writeWithPySparkTool.description,
  writeWithPySparkTool.parameters,
  writeWithPySparkTool.handler
);

server.tool(
  writeWithScalaSparkTool.name,
  writeWithScalaSparkTool.description,
  writeWithScalaSparkTool.parameters,
  writeWithScalaSparkTool.handler
);

server.tool(
  writeInvoiceDetailsWithSchemaTool.name,
  writeInvoiceDetailsWithSchemaTool.description,
  writeInvoiceDetailsWithSchemaTool.parameters,
  writeInvoiceDetailsWithSchemaTool.handler
);

server.tool(
  writeWithDeltaLakeTool.name,
  writeWithDeltaLakeTool.description,
  writeWithDeltaLakeTool.parameters,
  writeWithDeltaLakeTool.handler
);

server.tool(
  createDeltaTableTool.name,
  createDeltaTableTool.description,
  createDeltaTableTool.parameters,
  createDeltaTableTool.handler
);

// Initialize and run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Delta Table MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});