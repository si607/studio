
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
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: [
        {media: {url: input.photoDataUri}},
        {text: 'Analyze the provided image. Upscale its resolution significantly (e.g., 2x or 4x if possible) while maintaining or improving clarity. Reduce any visible noise or artifacts. If human faces are present, subtly enhance their clarity and features, such as eyes and skin texture, without altering the person\'s identity or making them look artificial. The goal is a natural-looking, high-quality enhancement. Preserve the original artistic style and composition.'},
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
      throw new Error('AI model did not return an image. The content might have been blocked or the model failed to produce an image.');
    }
    return {enhancedPhotoDataUri: media.url};
  }
);
