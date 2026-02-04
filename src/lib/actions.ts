"use server";

import {
  predictMaintenance,
  type PredictiveMaintenanceInput,
  type PredictiveMaintenanceOutput,
} from "@/ai/flows/predictive-maintenance-suggestions";

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
