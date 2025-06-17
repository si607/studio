
'use server';

/**
 * @fileOverview Colorizes a black and white image using AI.
 *
 * - colorizeImage - A function that colorizes an image.
 * - ColorizeImageInput - The input type for the colorizeImage function.
 * - ColorizeImageOutput - The return type for the colorizeImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ColorizeImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A black and white photo to be colorized, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ColorizeImageInput = z.infer<typeof ColorizeImageInputSchema>;

const ColorizeImageOutputSchema = z.object({
  enhancedPhotoDataUri: z
    .string()
    .describe(
      'The colorized photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type ColorizeImageOutput = z.infer<typeof ColorizeImageOutputSchema>;

export async function colorizeImage(input: ColorizeImageInput): Promise<ColorizeImageOutput> {
  return colorizeImageFlow(input);
}

const colorizeImageFlow = ai.defineFlow(
  {
    name: 'colorizeImageFlow',
    inputSchema: ColorizeImageInputSchema,
    outputSchema: ColorizeImageOutputSchema,
  },
  async input => {
    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [
          {media: {url: input.photoDataUri}},
          {text: "Transform the provided image with rich, vivid, and lifelike colors. If it's black and white or grayscale, apply a full, high-fidelity colorization that is both historically accurate (if applicable) and aesthetically stunning. Aim for deep, natural tones and excellent contrast. If already in color, significantly boost its vibrancy, correct any color casts, and enhance overall color harmony for a professional, eye-catching result."},
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
        console.error('[colorizeImageFlow] Detailed error during AI generation. Check original error message and Next.js digest (if applicable) in server logs. Original Error:', e);
        let clientErrorMessage = 'Photo colorization failed due to an unexpected server error. Please check server logs for details like an error digest.';
        if (e && typeof e.message === 'string' && !e.message.toLowerCase().includes('html')) {
            if (e.message.includes('API key not valid') || e.message.includes('permission denied') || e.message.includes('Authentication failed')) {
                clientErrorMessage = 'Photo colorization failed: There seems to be an issue with the server configuration (e.g., API key or permissions). Please contact support.';
            } else if (e.message.includes('quota') || e.message.includes('limit')) {
                 clientErrorMessage = 'Photo colorization failed: The service may be experiencing high demand or a quota limit has been reached. Please try again later.';
            } else if (e.message.includes('Billing account not found')) {
                 clientErrorMessage = 'Photo colorization failed: Billing account issue. Please contact support.';
            } else {
                const originalMessage = (e && typeof e.message === 'string' && !e.message.toLowerCase().includes('<html')) ? e.message : 'Details in server logs.';
                clientErrorMessage = `Colorization error: ${originalMessage}`;
            }
        }
        throw new Error(clientErrorMessage);
      }
  }
);
