'use server';
/**
 * @fileOverview A flow to retrieve vehicle details from an external API using a VIN.
 *
 * - getVinDetails - A function that fetches car data for a given VIN.
 * - VinDetailsInput - The input type for the getVinDetails function.
 * - VinDetailsOutput - The return type for the getVinDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VinDetailsInputSchema = z.object({
  vin: z.string().length(17).describe('The 17-character Vehicle Identification Number.'),
});
export type VinDetailsInput = z.infer<typeof VinDetailsInputSchema>;

const VinDetailsOutputSchema = z.object({
  make: z.string().describe('The manufacturer of the vehicle.'),
  model: z.string().describe('The model of the vehicle.'),
  year: z.number().describe('The manufacturing year of the vehicle.'),
});
export type VinDetailsOutput = z.infer<typeof VinDetailsOutputSchema>;

// This tool simulates calling the external DB.VIN API.
const getVinDataFromApi = ai.defineTool(
    {
        name: 'getVinDataFromApi',
        description: 'Fetches vehicle details (make, model, year) for a given VIN from an external API.',
        inputSchema: z.object({ vin: z.string().length(17) }),
        outputSchema: VinDetailsOutputSchema,
    },
    async ({ vin }) => {
        // For this demo, we'll return mock data to simulate the API call.
        console.log(`[Tool] Simulating API call for VIN: ${vin}`);
        if (vin.toUpperCase().startsWith('JN1')) {
            return { make: 'Nissan', model: 'Patrol', year: 2023 };
        }
        if (vin.toUpperCase().startsWith('SAL')) {
            return { make: 'Land Rover', model: 'Range Rover', year: 2022 };
        }
        if (vin.toUpperCase().startsWith('WBA')) {
            return { make: 'BMW', model: 'X5', year: 2021 };
        }
        return { make: 'Toyota', model: 'Camry', year: 2020 };
    }
);


const getVinDetailsFlow = ai.defineFlow(
  {
    name: 'getVinDetailsFlow',
    inputSchema: VinDetailsInputSchema,
    outputSchema: VinDetailsOutputSchema,
  },
  async (input) => {
    // We instruct the LLM to use our tool to fulfill the request.
    const response = await ai.generate({
        prompt: `A user wants to know the details for the VIN: ${input.vin}. Use the getVinDataFromApi tool to fetch this information.`,
        tools: [getVinDataFromApi],
    });

    const toolResponse = response.toolRequest?.tool.output;

    if (!toolResponse) {
        console.error("LLM failed to call the tool. Response:", response.text);
        // As a fallback, we can call the tool directly.
        return getVinDataFromApi(input);
    }
    
    return toolResponse;
  }
);


export async function getVinDetails(
  input: VinDetailsInput
): Promise<VinDetailsOutput> {
  return getVinDetailsFlow(input);
}
