
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
  enhancedPhotoDataUri: z // Keep consistent naming with other enhancement outputs
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
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: [
        {media: {url: input.photoDataUri}},
        {text: 'Analyze the provided image. If it is black and white or grayscale, colorize it with realistic, vibrant, and historically/contextually appropriate colors. Aim for a natural look. If the image is already in color, either return it as is or make subtle, tasteful color enhancements to improve vibrancy and balance, without drastically altering the original color scheme.'},
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
      throw new Error('AI model did not return an image for colorization. The content might have been blocked or the model failed to produce an image.');
    }
    return {enhancedPhotoDataUri: media.url};
  }
);
