
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
    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [
          {media: {url: input.photoDataUri}},
          {text: "Thoroughly restore the provided image by meticulously identifying and eliminating all noticeable scratches, creases, tears, spots, and other physical damages. The restoration should be comprehensive, resulting in a pristine image. Prioritize preserving original details and textures, but ensure significant removal of imperfections for a dramatically cleaner appearance. Avoid an overly smooth or artificial digital look."},
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        },
      });
      if (!media?.url) {
        throw new Error('AI model did not return an image. This could be due to content safety filters blocking the request, an issue with the input image, or a temporary model problem. Please try a different image or try again later.');
      }
      return {enhancedPhotoDataUri: media.url};
    } catch (e: any) {
        console.error('[removeScratchesFlow] Detailed error during AI generation. Check original error message and Next.js digest (if applicable) in server logs. Original Error:', e);
        let clientErrorMessage = 'Scratch removal failed due to an unexpected server error. Please check server logs for details like an error digest.';
        if (e && typeof e.message === 'string' && !e.message.toLowerCase().includes('html')) {
            if (e.message.includes('API key not valid') || e.message.includes('permission denied') || e.message.includes('Authentication failed')) {
                clientErrorMessage = 'Scratch removal failed: There seems to be an issue with the server configuration (e.g., API key or permissions). Please contact support.';
            } else if (e.message.includes('quota') || e.message.includes('limit')) {
                 clientErrorMessage = 'Scratch removal failed: The service may be experiencing high demand or a quota limit has been reached. Please try again later.';
            } else if (e.message.includes('Billing account not found')) {
                 clientErrorMessage = 'Scratch removal failed: Billing account issue. Please contact support.';
            } else {
                const originalMessage = (e && typeof e.message === 'string' && !e.message.toLowerCase().includes('<html')) ? e.message : 'Details in server logs.';
                clientErrorMessage = `Scratch removal error: ${originalMessage}`;
            }
        }
        throw new Error(clientErrorMessage);
      }
  }
);
