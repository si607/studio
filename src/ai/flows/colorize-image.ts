
'use server';

/**
 * @fileOverview Colorizes a black and white image using AI.
 *
 * - colorizeImage - A function that colorizes an image.
 * - ColorizeImageInput - The input type for the colorizeImage function.
 * - ColorizeImageOutput - The return type for the colorizeImage function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

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
          {text: "Transform the provided image with rich, vivid, and lifelike colors. If it's black and white or grayscale, apply a full, high-fidelity colorization that is both historically accurate (if applicable) and aesthetically stunning. Aim for deep, natural tones and excellent contrast. If already in color, significantly boost its vibrancy, correct any color casts, and enhance overall color harmony for a professional, eye-catching result. Also, subtly incorporate a small, semi-transparent watermark 'PicShine AI' in a bottom corner of the image."},
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
        throw new Error('AI model did not return an image for colorization. This could be due to content safety filters blocking the request, an issue with the input image, or a temporary model problem. Please try a different image or try again later.');
      }
      return {enhancedPhotoDataUri: media.url};
    } catch (e: any) {
        console.error(
          `[colorizeImageFlow] CRITICAL ERROR during AI generation. CHECK FIREBASE FUNCTION LOGS CAREFULLY. Look for: Next.js error digest, Google AI API error messages, API key issues, billing status, or permission problems. Original error object:`,
          e
        );
        let clientErrorMessage = 'Photo colorization failed due to an unexpected server error. PLEASE CHECK SERVER LOGS (e.g., Firebase Function logs) for details like a Next.js error digest or Google AI API errors.';
        
        if (e && typeof e.message === 'string') {
            const lowerMsg = e.message.toLowerCase();
            const originalMsg = e.message;

            if (lowerMsg.includes('an error occurred in the server components render') || 
                (originalMsg.toLowerCase().includes("google ai") && originalMsg.toLowerCase().includes("failed")) ||
                lowerMsg.includes('internal server error') ||
                lowerMsg.includes('failed to fetch') ||
                (lowerMsg.includes("<html") && !lowerMsg.includes("</html>") && originalMsg.length < 300 && !originalMsg.toLowerCase().includes('<html><head><meta name="robots" content="noindex"/></head><body>')) 
            ) {
                 clientErrorMessage = `CRITICAL: Photo colorization failed due to a server-side configuration issue. YOU MUST CHECK YOUR FIREBASE FUNCTION LOGS for the detailed error digest. This is often related to Google AI API key, billing, or permissions in your production environment.`;
            } else if (lowerMsg.includes('api key not valid') || lowerMsg.includes('permission denied') || lowerMsg.includes('authentication failed')) {
                clientErrorMessage = 'Photo colorization failed: Server configuration error (API key, permissions). Please check Firebase Function logs and contact support. Ensure GOOGLE_API_KEY is correctly set as a secure environment variable in Firebase App Hosting.';
            } else if (lowerMsg.includes('quota') || lowerMsg.includes('limit')) {
                 clientErrorMessage = 'Photo colorization failed: Service demand/quota limit reached. Please try again later. Check Firebase Function logs.';
            } else if (lowerMsg.includes('billing account not found') || lowerMsg.includes('billing')) {
                 clientErrorMessage = 'Photo colorization failed: Billing account issue. Please check Firebase Function logs and contact support.';
            } else if (lowerMsg.includes('blocked by safety setting') || lowerMsg.includes('safety policy violation')) {
                clientErrorMessage = 'Photo colorization failed: Image blocked by content safety policy. Try a different image.';
            } else if (lowerMsg.includes('ai model did not return an image')) {
                 clientErrorMessage = e.message; 
            } else {
                const displayMessage = originalMsg.length < 200 ? originalMsg : 'See server logs for full details.';
                clientErrorMessage = `Colorization error: ${displayMessage} (Check Firebase Function logs for full details)`;
            }
        }
        throw new Error(clientErrorMessage);
      }
  }
);

    