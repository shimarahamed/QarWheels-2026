"use server";

import {
  predictMaintenance,
  type PredictiveMaintenanceInput,
  type PredictiveMaintenanceOutput,
} from "@/ai/flows/predictive-maintenance-suggestions";
import {
  summarizeServiceHistory as summarize,
  type SummarizeServiceHistoryInput,
  type SummarizeServiceHistoryOutput,
} from "@/ai/flows/summarize-service-history";

export async function getMaintenancePredictions(
  input: PredictiveMaintenanceInput
): Promise<PredictiveMaintenanceOutput> {
  // Here you could add user authentication checks
  // and further data validation if needed.
  try {
    const output = await predictMaintenance(input);
    return output;
  } catch (error) {
    console.error("Error in getMaintenancePredictions action:", error);
    // It's better to throw a more specific error or handle it gracefully
    throw new Error("Failed to get predictions from the AI model.");
  }
}

export async function summarizeServiceHistory(
  input: SummarizeServiceHistoryInput
): Promise<SummarizeServiceHistoryOutput> {
  try {
    const output = await summarize(input);
    return output;
  } catch (error) {
    console.error("Error in summarizeServiceHistory action:", error);
    throw new Error("Failed to get summary from the AI model.");
  }
}
