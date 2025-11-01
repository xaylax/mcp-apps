import { z } from "zod";
import { SynapseService } from "../services/synapseService.js";

export const uploadToAdlsTool = {
  name: "upload_to_adls",
  description: "Uploads data to Azure Data Lake Storage Gen2 (ADLS Gen2) in a Synapse workspace. Creates a new file and uploads the provided data. If the file already exists, it will be overwritten.",
  parameters: {
    filePath: z.string().describe("The path where the file should be created in ADLS Gen2 (e.g., 'data/records/file.json')"),
    data: z.string().describe("The data to upload (as string or JSON string)"),
    format: z.enum(["text", "json"]).optional().default("text").describe("The format of the data (default: 'text')")
  },
  handler: async ({ filePath, data, format = "text" }: { filePath: string; data: string; format?: "text" | "json" }) => {
    try {
      const synapseService = new SynapseService();
      let dataToUpload: string;
      if (format === "json") {
        const jsonData = JSON.parse(data);
        dataToUpload = JSON.stringify(jsonData, null, 2);
      } else {
        dataToUpload = data;
      }
      await synapseService.uploadToADLS(filePath, dataToUpload);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: `Successfully uploaded data to ${filePath}`, filePath, size: dataToUpload.length, format }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};

export const appendToAdlsTool = {
  name: "append_to_adls",
  description: "Appends data to an existing file in Azure Data Lake Storage Gen2 (ADLS Gen2). The file must already exist. Use this for adding records to existing files or log files.",
  parameters: {
    filePath: z.string().describe("The path to the existing file in ADLS Gen2"),
    data: z.string().describe("The data to append to the file")
  },
  handler: async ({ filePath, data }: { filePath: string; data: string }) => {
    try {
      const synapseService = new SynapseService();
      const serviceClient = synapseService.getDataLakeServiceClient();
      const fileSystemClient = serviceClient.getFileSystemClient(synapseService.getFileSystemName());
      const fileClient = fileSystemClient.getFileClient(filePath);
      const properties = await fileClient.getProperties();
      const currentSize = properties.contentLength || 0;
      await synapseService.appendToADLS(filePath, data, currentSize);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: `Successfully appended data to ${filePath}`, filePath, appendedBytes: data.length, newSize: currentSize + data.length }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};

export const listAdlsFilesTool = {
  name: "list_adls_files",
  description: "Lists files in an ADLS Gen2 directory. Retrieves a list of all files in the specified directory path.",
  parameters: {
    directoryPath: z.string().optional().default("").describe("The directory path to list files from (leave empty for root)")
  },
  handler: async ({ directoryPath = "" }: { directoryPath?: string }) => {
    try {
      const synapseService = new SynapseService();
      const files = await synapseService.listFiles(directoryPath);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, directoryPath: directoryPath || "/", count: files.length, files }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};

export const createAdlsDirectoryTool = {
  name: "create_adls_directory",
  description: "Creates a directory in ADLS Gen2. Creates a new directory at the specified path.",
  parameters: {
    directoryPath: z.string().describe("The path where the directory should be created")
  },
  handler: async ({ directoryPath }: { directoryPath: string }) => {
    try {
      const synapseService = new SynapseService();
      await synapseService.createDirectory(directoryPath);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: `Successfully created directory ${directoryPath}`, directoryPath }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};
