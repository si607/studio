
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
        throw new Error('AI model did not return an image for smart enhancement. This could be due to content safety filters blocking the request, an issue with the input image, or a temporary model problem. Please try a different image or try again later.');
      }
      return {enhancedPhotoDataUri: media.url};
    } catch (e: any) {
        console.error(
          `[smartEnhanceImageFlow] CRITICAL ERROR during AI generation. CHECK FIREBASE FUNCTION LOGS CAREFULLY. Look for: Next.js error digest, Google AI API error messages, API key issues, billing status, or permission problems. Original error object:`,
          e
        );
        let clientErrorMessage = 'Photo enhancement failed due to an unexpected server error. PLEASE CHECK SERVER LOGS (e.g., Firebase Function logs) for details like a Next.js error digest or Google AI API errors.';
        
        if (e && typeof e.message === 'string') {
            const lowerMsg = e.message.toLowerCase();
            const originalMsg = e.message;

            if (lowerMsg.includes('an error occurred in the server components render') || 
                (originalMsg.toLowerCase().includes("google ai") && originalMsg.toLowerCase().includes("failed")) ||
                lowerMsg.includes('internal server error') ||
                lowerMsg.includes('failed to fetch') ||
                (lowerMsg.includes("<html") && !lowerMsg.includes("</html>") && originalMsg.length < 300) 
            ) {
                 clientErrorMessage = `CRITICAL: Photo enhancement failed due to a server-side configuration issue. YOU MUST CHECK YOUR FIREBASE FUNCTION LOGS for the detailed error digest. This is often related to Google AI API key, billing, or permissions in your production environment.`;
            } else if (lowerMsg.includes('api key not valid') || lowerMsg.includes('permission denied') || lowerMsg.includes('authentication failed')) {
                clientErrorMessage = 'Photo enhancement failed: Server configuration error (API key, permissions). Please check Firebase Function logs and contact support.';
            } else if (lowerMsg.includes('quota') || lowerMsg.includes('limit')) {
                 clientErrorMessage = 'Photo enhancement failed: Service demand/quota limit reached. Please try again later. Check Firebase Function logs.';
            } else if (lowerMsg.includes('billing account not found') || lowerMsg.includes('billing') ) {
                 clientErrorMessage = 'Photo enhancement failed: Billing account issue. Please check Firebase Function logs and contact support.';
            } else if (lowerMsg.includes('blocked by safety setting') || lowerMsg.includes('safety policy violation')) {
                clientErrorMessage = 'Photo enhancement failed: Image blocked by content safety policy. Try a different image.';
            } else if (lowerMsg.includes('ai model did not return an image')) {
                 clientErrorMessage = e.message; 
            } else {
                const displayMessage = originalMsg.length < 200 ? originalMsg : 'See server logs for full details.';
                clientErrorMessage = `Enhancement error: ${displayMessage} (Check Firebase Function logs for full details)`;
            }
        }
        throw new Error(clientErrorMessage);
      }
  }
);
    
