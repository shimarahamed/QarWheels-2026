'use server';

/**
 * @fileOverview Predicts upcoming maintenance needs for a car based on VIN, mileage, service history, and Qatar's climate.
 *
 * - predictMaintenance - Predicts maintenance needs for a car.
 * - PredictiveMaintenanceInput - The input type for the predictMaintenance function.
 * - PredictiveMaintenanceOutput - The return type for the predictMaintenance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictiveMaintenanceInputSchema = z.object({
  vin: z.string().describe('The Vehicle Identification Number of the car.'),
  mileage: z.number().describe('The current mileage of the car in kilometers.'),
  serviceHistory: z
    .string()
    .describe(
      'A JSON string containing the service history of the car, including dates, service types, and descriptions.'
    ),
  qatarClimate: z
    .string()
    .describe(
      'A description of the typical climate conditions in Qatar, including temperature ranges, humidity, and seasonal weather patterns.'
    ),
});
export type PredictiveMaintenanceInput = z.infer<typeof PredictiveMaintenanceInputSchema>;

const PredictiveMaintenanceOutputSchema = z.object({
  predictedMaintenanceNeeds: z
    .string()
    .describe(
      'A list of predicted upcoming maintenance needs for the car, including the type of service, the estimated timeframe (in months or kilometers), and a brief explanation of why the service is needed.'
    ),
  confidenceLevel: z
    .string()
    .describe(
      'A string that tells how confident the LLM is in its predictions, and what data it used to make the predictions.'
    ),
});
export type PredictiveMaintenanceOutput = z.infer<typeof PredictiveMaintenanceOutputSchema>;

export async function predictMaintenance(
  input: PredictiveMaintenanceInput
): Promise<PredictiveMaintenanceOutput> {
  return predictMaintenanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictMaintenancePrompt',
  input: {schema: PredictiveMaintenanceInputSchema},
  output: {schema: PredictiveMaintenanceOutputSchema},
  prompt: `You are an expert automotive technician with extensive experience in Qatar.

You will use the provided vehicle information, service history, and knowledge of Qatar's climate to predict upcoming maintenance needs for the car.

Vehicle Information:
VIN: {{{vin}}}
Mileage: {{{mileage}}} km

Service History:
{{{serviceHistory}}}

Qatar Climate:
{{{qatarClimate}}}

Based on this information, what are the predicted upcoming maintenance needs for this car? Include a confidence level. Ensure the response is detailed and specific to the car's age and mileage.
`,
});

const predictMaintenanceFlow = ai.defineFlow(
  {
    name: 'predictMaintenanceFlow',
    inputSchema: PredictiveMaintenanceInputSchema,
    outputSchema: PredictiveMaintenanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.predictedMaintenanceNeeds) {
      return {
        predictedMaintenanceNeeds: "Maintenance prediction is unavailable for this vehicle at the moment. Please ensure your mileage and service history are up to date.",
        confidenceLevel: "N/A"
      };
    }
    return output;
  }
);
