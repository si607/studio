
'use server';
/**
 * @fileOverview Removes scratches and minor damages from an old photo.
 *
 * - removeScratches - A function that processes an image to remove scratches.
 * - RemoveScratchesInput - The input type for the removeScratches function.
 * - RemoveScratchesOutput - The return type for the removeScratches function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RemoveScratchesInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo with scratches or minor damages, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RemoveScratchesInput = z.infer<typeof RemoveScratchesInputSchema>;

const RemoveScratchesOutputSchema = z.object({
  enhancedPhotoDataUri: z
    .string()
    .describe(
      'The photo with scratches removed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type RemoveScratchesOutput = z.infer<typeof RemoveScratchesOutputSchema>;

export async function removeScratches(input: RemoveScratchesInput): Promise<RemoveScratchesOutput> {
  return removeScratchesFlow(input);
}

const removeScratchesFlow = ai.defineFlow(
  {
    name: 'removeScratchesFlow',
    inputSchema: RemoveScratchesInputSchema,
    outputSchema: RemoveScratchesOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: [
        {media: {url: input.photoDataUri}},
        {text: 'Analyze the provided image. Identify and carefully remove scratches, creases, small tears, and other minor physical damages. The goal is to restore the image to a cleaner state while preserving original details, textures, and the overall character of the photo. Avoid over-smoothing or creating an artificial look.'},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
         safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      },
    });
    if (!media?.url) {
      throw new Error('AI model did not return an image for scratch removal. The content might have been blocked or the model failed to produce an image.');
    }
    return {enhancedPhotoDataUri: media.url};
  }
);
