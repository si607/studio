
'use server';
/**
 * @fileOverview Removes the background from an image using AI.
 *
 * - removeBackground - A function that processes an image to remove its background.
 * - RemoveBackgroundInput - The input type for the removeBackground function.
 * - RemoveBackgroundOutput - The return type for the removeBackground function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const RemoveBackgroundInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo from which to remove the background, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RemoveBackgroundInput = z.infer<typeof RemoveBackgroundInputSchema>;

const RemoveBackgroundOutputSchema = z.object({
  enhancedPhotoDataUri: z
    .string()
    .describe(
      'The photo with its background removed (transparent), as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type RemoveBackgroundOutput = z.infer<typeof RemoveBackgroundOutputSchema>;

export async function removeBackground(input: RemoveBackgroundInput): Promise<RemoveBackgroundOutput> {
  return removeBackgroundFlow(input);
}

const removeBackgroundFlow = ai.defineFlow(
  {
    name: 'removeBackgroundFlow',
    inputSchema: RemoveBackgroundInputSchema,
    outputSchema: RemoveBackgroundOutputSchema,
  },
  async input => {
    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [
          {media: {url: input.photoDataUri}},
          {text: "Your task is to precisely remove the background from this image. Identify the primary subject(s) with extreme accuracy. Create a clean, sharp cutout with a fully transparent background. Pay special attention to complex edges like hair, fur, or fine details, ensuring no background remnants are left and the subject's edges are not cropped. The final output must be a high-quality PNG with a perfect alpha channel. Do not add any watermark or alter the subject itself."},
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
        throw new Error('AI model did not return an image for background removal. This could be due to content safety filters blocking the request, an issue with the input image, or a temporary model problem. Please try a different image or try again later.');
      }
      return {enhancedPhotoDataUri: media.url};
    } catch (e: any) {
        const originalMessage = (e instanceof Error) ? e.message : String(e);
        console.error(
          `[removeBackgroundFlow] CRITICAL ERROR during AI generation. CHECK FIREBASE FUNCTION LOGS CAREFULLY. Look for: Next.js error digest, Google AI API error messages (API key, billing, permissions), quota issues, or model access problems. Original error object:`,
          e,
          JSON.stringify(e, Object.getOwnPropertyNames(e))
        );
        
        let clientErrorMessage = 'Background removal failed due to an unexpected server error. PLEASE CHECK SERVER LOGS (e.g., Firebase Function logs) for details like a Next.js error digest or Google AI API errors.';
        const lowerMsg = originalMessage.toLowerCase();

        if (lowerMsg.includes("not available in your country") || lowerMsg.includes("image generation is not available in your country")) {
            clientErrorMessage = 'Background removal failed: This AI feature is not available in your current region/country. Please check Google Cloud service availability.';
        } else if (originalMessage.startsWith('CRITICAL:') ||
            lowerMsg.includes('an error occurred in the server components render') || 
            (lowerMsg.includes("google ai") && lowerMsg.includes("failed")) ||
            lowerMsg.includes('internal server error') ||
            lowerMsg.includes('failed to fetch') ||
            (lowerMsg.includes("<html") && !lowerMsg.includes("</html>") && originalMessage.length < 300 && !originalMessage.toLowerCase().includes('<html><head><meta name="robots" content="noindex"/></head><body>')) 
        ) {
             clientErrorMessage = `CRITICAL: Background removal failed due to a server-side configuration issue. YOU MUST CHECK YOUR FIREBASE FUNCTION LOGS for the detailed error digest. This is often related to Google AI API key, billing, or permissions in your production environment.`;
        } else if (lowerMsg.includes('api key not valid') || lowerMsg.includes('permission denied') || lowerMsg.includes('authentication failed') || lowerMsg.includes('api_key_not_valid')) {
            clientErrorMessage = 'Background removal failed: Server configuration error (API key, permissions). Please check Firebase Function logs and contact support. Ensure GOOGLE_API_KEY is correctly set as a secure environment variable in Firebase App Hosting.';
        } else if (lowerMsg.includes('quota') || lowerMsg.includes('limit')) {
             clientErrorMessage = 'Background removal failed: Service demand/quota limit reached. Please try again later. Check Firebase Function logs.';
        } else if (lowerMsg.includes('billing account not found') || lowerMsg.includes('billing') || lowerMsg.includes('project_not_linked_to_billing_account')) {
             clientErrorMessage = 'Background removal failed: Billing account issue. Please check Firebase Function logs and contact support. Ensure your Google Cloud project has an active billing account.';
        } else if (lowerMsg.includes('blocked by safety setting') || lowerMsg.includes('safety policy violation')) {
            clientErrorMessage = 'Background removal failed: Image blocked by content safety policy. Try a different image.';
        } else if (lowerMsg.includes('ai model did not return an image')) {
             clientErrorMessage = originalMessage; 
        } else if (lowerMsg.includes('generative language api has not been used') || lowerMsg.includes('api is not enabled')) {
             clientErrorMessage = 'Background removal failed: The Google Generative Language API is not enabled for your project or has not been used before. Please enable it in the Google Cloud Console and try again. Check Firebase Function logs for details.';
        } else {
            const displayMessage = originalMessage.length < 200 ? originalMessage : 'See server logs for full details.';
            clientErrorMessage = `Background removal error: ${displayMessage} (Check Firebase Function logs for full details)`;
        }
        throw new Error(clientErrorMessage);
      }
  }
);
