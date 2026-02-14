'use server';
/**
 * @fileOverview Summarizes a car's service history, highlighting key maintenance events and potential issues.
 *
 * - summarizeServiceHistory - A function that summarizes the car's service history.
 * - SummarizeServiceHistoryInput - The input type for the summarizeServiceHistory function.
 * - SummarizeServiceHistoryOutput - The return type for the summarizeServiceHistory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeServiceHistoryInputSchema = z.object({
  serviceHistory: z.string().describe('The car service history as a text.'),
  vin: z.string().describe('The Vehicle Identification Number (VIN) of the car.'),
  make: z.string().describe('The manufacturer of the vehicle.'),
  model: z.string().describe('The model of the vehicle.'),
  year: z.number().describe('The manufacturing year of the vehicle.'),
});
export type SummarizeServiceHistoryInput = z.infer<typeof SummarizeServiceHistoryInputSchema>;

const SummarizeServiceHistoryOutputSchema = z.object({
  summary: z.string().describe('The summary of the car service history.'),
  potentialIssues: z.string().describe('Potential issues identified from the service history.'),
});
export type SummarizeServiceHistoryOutput = z.infer<typeof SummarizeServiceHistoryOutputSchema>;

export async function summarizeServiceHistory(input: SummarizeServiceHistoryInput): Promise<SummarizeServiceHistoryOutput> {
  return summarizeServiceHistoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeServiceHistoryPrompt',
  input: {schema: SummarizeServiceHistoryInputSchema},
  output: {schema: SummarizeServiceHistoryOutputSchema},
  prompt: `You are an expert automotive technician. Your task is to summarize the service history of a car and identify potential issues.

  You are provided with the vehicle's make, model, year, and full service history. Use this information to identify potential issues based on common failures for that specific model.

  Vehicle: {{{year}}} {{{make}}} {{{model}}}
  VIN: {{{vin}}}
  Service History: {{{serviceHistory}}}

  Provide a concise summary of the service history and list any potential issues identified. Be clear and precise.
`,
});

const summarizeServiceHistoryFlow = ai.defineFlow(
  {
    name: 'summarizeServiceHistoryFlow',
    inputSchema: SummarizeServiceHistoryInputSchema,
    outputSchema: SummarizeServiceHistoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI model failed to produce a valid summary output.");
    }
    return output;
  }
);
