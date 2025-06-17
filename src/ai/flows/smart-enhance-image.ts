
'use server';

/**
 * @fileOverview Smartly enhances an image, aiming for upscaling, noise reduction, and general face clarity using AI.
 *
 * - smartEnhanceImage - A function that enhances the image quality.
 * - SmartEnhanceImageInput - The input type for the smartEnhanceImage function.
 * - SmartEnhanceImageOutput - The return type for the smartEnhanceImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartEnhanceImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be enhanced, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SmartEnhanceImageInput = z.infer<typeof SmartEnhanceImageInputSchema>;

const SmartEnhanceImageOutputSchema = z.object({
  enhancedPhotoDataUri: z
    .string()
    .describe(
      'The enhanced photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type SmartEnhanceImageOutput = z.infer<typeof SmartEnhanceImageOutputSchema>;

export async function smartEnhanceImage(input: SmartEnhanceImageInput): Promise<SmartEnhanceImageOutput> {
  return smartEnhanceImageFlow(input);
}

const smartEnhanceImageFlow = ai.defineFlow(
  {
    name: 'smartEnhanceImageFlow',
    inputSchema: SmartEnhanceImageInputSchema,
    outputSchema: SmartEnhanceImageOutputSchema,
  },
  async input => {
    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [
          {media: {url: input.photoDataUri}},
          {text: "Dramatically enhance the provided image. Perform a significant upscaling, aiming for at least a 4x resolution increase, ensuring maximum detail and sharpness. Aggressively reduce noise and artifacts. For human faces, bring out fine details, improve skin texture, and enhance eye clarity for a striking, yet natural result. The output should be a remarkably improved, high-definition version of the original, while respecting its core composition."},
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
        console.error('[smartEnhanceImageFlow] Detailed error during AI generation (check for original error message and Next.js digest if applicable):', e);
        let clientErrorMessage = 'Photo enhancement failed due to an unexpected server error. Please check server logs for details.';
        if (e && typeof e.message === 'string' && !e.message.toLowerCase().includes('html')) {
            if (e.message.includes('API key not valid') || e.message.includes('permission denied') || e.message.includes('Authentication failed')) {
                clientErrorMessage = 'Photo enhancement failed: There seems to be an issue with the server configuration (e.g., API key or permissions). Please contact support.';
            } else if (e.message.includes('quota') || e.message.includes('limit')) {
                 clientErrorMessage = 'Photo enhancement failed: The service may be experiencing high demand or a quota limit has been reached. Please try again later.';
            } else if (e.message.includes('Billing account not found')) {
                 clientErrorMessage = 'Photo enhancement failed: Billing account issue. Please contact support.';
            } else {
                clientErrorMessage = `Enhancement error: ${e.message}`;
            }
        }
        throw new Error(clientErrorMessage);
      }
  }
);
