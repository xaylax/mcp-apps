import { z } from "zod";
import { SynapseService } from "../services/synapseService.js";

export const startPipelineTool = {
  name: "start_synapse_pipeline",
  description: "Starts a Synapse pipeline run. Triggers a pipeline execution in Azure Synapse Analytics. You can optionally provide parameters to pass to the pipeline.",
  parameters: {
    pipelineName: z.string().describe("The name of the Synapse pipeline to start"),
    parameters: z.record(z.any()).optional().describe("Optional parameters to pass to the pipeline")
  },
  handler: async ({ pipelineName, parameters }: { pipelineName: string; parameters?: Record<string, any> }) => {
    try {
      const synapseService = new SynapseService();
      const runId = await synapseService.startPipeline(pipelineName, parameters);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: `Successfully started pipeline ${pipelineName}`, pipelineName, runId, parameters: parameters || {} }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};

export const getPipelineStatusTool = {
  name: "get_pipeline_status",
  description: "Gets the status of a Synapse pipeline run. Retrieves the current status and details of a pipeline run. Use this to monitor pipeline execution after starting it.",
  parameters: {
    runId: z.string().describe("The pipeline run ID to check status for")
  },
  handler: async ({ runId }: { runId: string }) => {
    try {
      const synapseService = new SynapseService();
      const status = await synapseService.getPipelineRunStatus(runId);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, runId, status: status.status, pipelineName: status.pipelineName, runStart: status.runStart, runEnd: status.runEnd, durationInMs: status.durationInMs, message: status.message, parameters: status.parameters, fullDetails: status }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};

export const cancelPipelineTool = {
  name: "cancel_synapse_pipeline",
  description: "Cancels a running Synapse pipeline. Stops a pipeline run that is currently in progress.",
  parameters: {
    runId: z.string().describe("The pipeline run ID to cancel")
  },
  handler: async ({ runId }: { runId: string }) => {
    try {
      const synapseService = new SynapseService();
      await synapseService.cancelPipelineRun(runId);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: `Successfully cancelled pipeline run ${runId}`, runId }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};

export const listPipelinesTool = {
  name: "list_synapse_pipelines",
  description: "Lists all pipelines in the Synapse workspace. Retrieves the names of all available pipelines in the workspace.",
  parameters: {},
  handler: async () => {
    try {
      const synapseService = new SynapseService();
      const pipelines = await synapseService.listPipelines();
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, count: pipelines.length, pipelines }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};
