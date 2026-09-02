import { z } from 'zod';
import { ai, withRetry } from '../genkit';

const InputSchema = z.object({
  vin: z.string().length(17).regex(/^[A-HJ-NPR-Z0-9]{17}$/),
});

const OutputSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int().min(1900).max(2030),
});

export type VinDetailsInput = z.infer<typeof InputSchema>;
export type VinDetailsOutput = z.infer<typeof OutputSchema>;

const getVinDataFromApi = ai.defineTool(
  {
    name: 'getVinDataFromApi',
    description: 'Fetches vehicle make, model, and year for a given VIN from the NHTSA vPIC API.',
    inputSchema: z.object({ vin: z.string().length(17) }),
    outputSchema: OutputSchema,
  },
  async ({ vin }) => {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`NHTSA API error: ${res.status}`);

    const data = (await res.json()) as {
      Results?: Array<{ Make?: string; Model?: string; ModelYear?: string; ErrorCode?: string }>;
    };

    const result = data.Results?.[0];
    if (!result || result.ErrorCode !== '0') {
      throw new Error('VIN not found or invalid');
    }

    const year = parseInt(result.ModelYear ?? '', 10);
    if (!result.Make || !result.Model || isNaN(year)) {
      throw new Error('Incomplete VIN data from NHTSA');
    }

    return {
      make: result.Make,
      model: result.Model,
      year,
    };
  }
);

const getVinDetailsFlow = ai.defineFlow(
  {
    name: 'getVinDetailsFlow',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
  },
  async (input) => {
    // Use the tool directly — no need to involve the LLM for a structured lookup
    return withRetry(() => getVinDataFromApi(input));
  }
);

export async function getVinDetails(input: VinDetailsInput): Promise<VinDetailsOutput> {
  return getVinDetailsFlow(input);
}
