import { z } from "zod";
import { DeltaTableService } from "../services/deltaTableService.js";

const WriteInvoiceDetailsArgsSchema = z.object({
  tablePath: z.string().describe('The path to the delta table (e.g., data/ingestion/DeltaTables/invoice-details.delta)'),
  records: z.array(z.record(z.any())).describe('Array of invoice-details records to write')
});

export const writeInvoiceDetailsWithSchemaTool = {
  name: 'write_invoice_details_flattened',
  description: 'Writes invoice-details records to a Delta table by flattening deeply nested ChargeAllocations to JSON strings',
  parameters: WriteInvoiceDetailsArgsSchema.shape,
  handler: async (args: z.infer<typeof WriteInvoiceDetailsArgsSchema>) => {
    const { tablePath, records } = args;

    try {
      // Simplify ChargeAllocations by converting deeply nested arrays to JSON strings
      // Keep ChargeAllocations as an array, but flatten the 3rd+ level nesting
      const flattenedRecords = records.map(record => {
        const flattened = { ...record };
        
        if (Array.isArray(flattened.ChargeAllocations)) {
          flattened.ChargeAllocations = flattened.ChargeAllocations.map((allocation: any) => {
            const simplified = {
              chargeAmount: allocation.chargeAmount,
              isPaymentInstrumentTaxExempt: allocation.isPaymentInstrumentTaxExempt,
              // Flatten paymentInstrumentType to avoid nested object
              paymentInstrumentTypeFamily: allocation.paymentInstrumentType?.family || null,
              paymentInstrumentTypeType: allocation.paymentInstrumentType?.type || null,
              // Convert arrays to JSON strings to avoid deep nesting
              paymentReferencesJson: allocation.paymentReferences ? JSON.stringify(allocation.paymentReferences) : null,
              taxDetailsJson: allocation.taxDetails ? JSON.stringify(allocation.taxDetails) : null
            };
            return simplified;
          });
        }
        
        return flattened;
      });

      console.log("Writing invoice-details with simplified ChargeAllocations...");
      const service = new DeltaTableService();
      const result = await service.writeToTable(tablePath, flattenedRecords);
      
      return {
        content: [{
          type: "text" as const,
          text: `${result}\nSuccessfully wrote ${records.length} invoice-details records with flattened ChargeAllocations to ${tablePath}`
        }]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error in writeInvoiceDetailsFlattened:", errorMessage);
      
      return {
        content: [{
          type: "text" as const,
          text: `Error writing flattened invoice-details: ${errorMessage}\n\nThis tool flattens deeply nested ChargeAllocations by converting paymentReferences and taxDetails to JSON strings.`
        }],
        isError: true
      };
    }
  }
};
