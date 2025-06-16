// src/ai/flows/suggest-improvements.ts
'use server';
/**
 * @fileOverview Provides AI suggestions for image improvements.
 *
 * - suggestImprovements - A function that takes an image and returns improvement suggestions.
 * - SuggestImprovementsInput - The input type for the suggestImprovements function.
 * - SuggestImprovementsOutput - The return type for the suggestImprovements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestImprovementsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be improved, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SuggestImprovementsInput = z.infer<typeof SuggestImprovementsInputSchema>;

const SuggestImprovementsOutputSchema = z.object({
  suggestedImprovements: z
    .array(z.string())
    .describe('A list of suggested improvements for the image.'),
});
export type SuggestImprovementsOutput = z.infer<typeof SuggestImprovementsOutputSchema>;

export async function suggestImprovements(
  input: SuggestImprovementsInput
): Promise<SuggestImprovementsOutput> {
  return suggestImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestImprovementsPrompt',
  input: {schema: SuggestImprovementsInputSchema},
  output: {schema: SuggestImprovementsOutputSchema},
  prompt: `You are an AI expert in image enhancement.

  Given the image, suggest a few potential improvements to enhance its visual appeal. Suggest concrete actions like adjusting brightness, contrast, sharpness, color balance etc.
  Return the suggestions as a list of strings.

  Image: {{media url=photoDataUri}}`,
});

const suggestImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestImprovementsFlow',
    inputSchema: SuggestImprovementsInputSchema,
    outputSchema: SuggestImprovementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
