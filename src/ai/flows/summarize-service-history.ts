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

  Summarize the following service history, highlighting key maintenance events and potential issues. Also consider the VIN number to identify the car model, and base potential issues on common failures for that model.

  Service History: {{{serviceHistory}}}
  VIN: {{{vin}}}

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
    return output!;
  }
);
