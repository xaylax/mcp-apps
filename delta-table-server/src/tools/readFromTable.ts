import { z } from "zod";
import { DeltaTableService } from "../services/deltaTableService.js";

export const readFromTableTool = {
  name: "read_from_table",
  description: "Read all records from a delta table at the specified path",
  parameters: {
    tablePath: z.string().describe("The path to the delta table (e.g., 'test-tables/my-table')")
  },
  handler: async (args: { tablePath: string }) => {
    try {
      const service = new DeltaTableService();
      const records = await service.readFromTable(args.tablePath);
      
      // Reconstruct flattened ChargeAllocations if present
      const reconstructedRecords = records.map(record => {
        const reconstructed = { ...record };
        
        // Check if ChargeAllocations has simplified structure with JSON strings
        if (Array.isArray(reconstructed.ChargeAllocations)) {
          reconstructed.ChargeAllocations = reconstructed.ChargeAllocations.map((allocation: any) => {
            const reconstructedAllocation = { ...allocation };
            
            // Reconstruct paymentReferences from JSON string
            if (allocation.paymentReferencesJson && typeof allocation.paymentReferencesJson === 'string') {
              try {
                reconstructedAllocation.paymentReferences = JSON.parse(allocation.paymentReferencesJson);
                delete reconstructedAllocation.paymentReferencesJson;
              } catch (e) {
                console.warn('Failed to parse paymentReferencesJson:', e);
              }
            }
            
            // Reconstruct taxDetails from JSON string
            if (allocation.taxDetailsJson && typeof allocation.taxDetailsJson === 'string') {
              try {
                reconstructedAllocation.taxDetails = JSON.parse(allocation.taxDetailsJson);
                delete reconstructedAllocation.taxDetailsJson;
              } catch (e) {
                console.warn('Failed to parse taxDetailsJson:', e);
              }
            }
            
            return reconstructedAllocation;
          });
        }
        
        return reconstructed;
      });
      
      return {
        content: [
          {
            type: "text" as const,
            text: `Read ${reconstructedRecords.length} records from table at ${args.tablePath}\n\nRecords:\n${JSON.stringify(reconstructedRecords, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error reading from delta table: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
};