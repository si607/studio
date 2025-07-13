
'use server';

/**
 * @fileOverview Applies a stylistic filter to an image using AI.
 *
 * - applyFilter - A function that applies a named filter to an image.
 * - ApplyFilterInput - The input type for the applyFilter function.
 * - ApplyFilterOutput - The return type for the applyFilter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ApplyFilterInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to apply a filter to, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  filterName: z.string().describe("The name of the filter to apply (e.g., 'Vintage Film', 'Neon Punk')."),
});
export type ApplyFilterInput = z.infer<typeof ApplyFilterInputSchema>;

const ApplyFilterOutputSchema = z.object({
  filteredPhotoDataUri: z
    .string()
    .describe(
      'The photo with the filter applied, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type ApplyFilterOutput = z.infer<typeof ApplyFilterOutputSchema>;

export async function applyFilter(input: ApplyFilterInput): Promise<ApplyFilterOutput> {
  return applyFilterFlow(input);
}

const applyFilterFlow = ai.defineFlow(
  {
    name: 'applyFilterFlow',
    inputSchema: ApplyFilterInputSchema,
    outputSchema: ApplyFilterOutputSchema,
  },
  async input => {
    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: [
          {media: {url: input.photoDataUri}},
          {
            text: `You are an expert AI photo filtering engine. Your single, most important task is to apply a stylistic filter named "${input.filterName}" to this image while **strictly preserving the original subject's identity, pose, and core composition.**

Follow these critical instructions:
1.  **Analyze the Filter Name:** Interpret the creative style from the filter name: "${input.filterName}".
2.  **Apply Style:** Re-render the image with the requested artistic style. For example, if the filter is 'Sketch', make the image look like a hand-drawn sketch. If it's 'Vintage Film', apply color grading, grain, and lighting from that era.
3.  **Identity is Paramount:** The output must clearly be the same person and subject. Do not alter bone structure, jawline, or unique facial characteristics. The pose and main objects must remain the same.
4.  **No Watermarks:** Do not add any watermark or text to the image.`,
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: [
            {category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH'},
            {category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE'},
            {category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH'},
            {category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH'},
          ],
        },
      });
      if (!media?.url) {
        throw new Error('AI model did not return an image for the filter application. This could be due to content safety filters, an issue with the input image, or a temporary model problem. Please try a different image or filter.');
      }
      return {filteredPhotoDataUri: media.url};
    } catch (e: any) {
      const originalMessage = e instanceof Error ? e.message : String(e);
      console.error(
        `[applyFilterFlow] CRITICAL ERROR during AI generation. CHECK FIREBASE FUNCTION LOGS CAREFULLY. Look for: Next.js error digest, Google AI API error messages (API key, billing, permissions), quota issues, or model access problems. Original error object:`,
        e,
        JSON.stringify(e, Object.getOwnPropertyNames(e))
      );

      let clientErrorMessage = 'Filter application failed due to an unexpected server error. PLEASE CHECK SERVER LOGS (e.g., Firebase Function logs) for details like a Next.js error digest or Google AI API errors.';
      const lowerMsg = originalMessage.toLowerCase();

      if (lowerMsg.includes('api key not valid') || lowerMsg.includes('permission denied') || lowerMsg.includes('authentication failed') || lowerMsg.includes('api_key_not_valid')) {
        clientErrorMessage = 'Filter application failed: Server configuration error (API key, permissions). Please check Firebase Function logs and contact support. Ensure GOOGLE_API_KEY is correctly set as a secure environment variable in Firebase App Hosting.';
      } else if (lowerMsg.includes('billing account not found') || lowerMsg.includes('billing') || lowerMsg.includes('project_not_linked_to_billing_account')) {
        clientErrorMessage = 'Filter application failed: Billing account issue. Please check Firebase Function logs and contact support. Ensure your Google Cloud project has an active billing account.';
      } else if (lowerMsg.includes('generative language api has not been used') || lowerMsg.includes('api is not enabled')) {
        clientErrorMessage = 'Filter application failed: The Google Generative Language API is not enabled for your project or has not been used before. Please enable it in the Google Cloud Console and try again. Check Firebase Function logs for details.';
      } else if (lowerMsg.includes('not available in your country') || lowerMsg.includes('image generation is not available in your country')) {
        clientErrorMessage = 'Filter application failed: This AI feature is not available in your current region/country. Please check Google Cloud service availability.';
      } else if (lowerMsg.includes('quota') || lowerMsg.includes('limit')) {
        clientErrorMessage = 'Filter application failed: Service demand/quota limit reached. Please try again later. Check Firebase Function logs.';
      } else if (lowerMsg.includes('blocked by safety setting') || lowerMsg.includes('safety policy violation')) {
        clientErrorMessage = 'Filter application failed: Image blocked by content safety policy. Try a different image.';
      } else if (lowerMsg.includes('ai model did not return an image')) {
        clientErrorMessage = originalMessage;
      } else if (
        originalMessage.startsWith('CRITICAL:') ||
        lowerMsg.includes('an error occurred in the server components render') ||
        (lowerMsg.includes('google ai') && lowerMsg.includes('failed')) ||
        lowerMsg.includes('internal server error') ||
        lowerMsg.includes('failed to fetch') ||
        (lowerMsg.includes('<html') && !lowerMsg.includes('</html>') && originalMessage.length < 300 && !originalMessage.toLowerCase().includes('<html><head><meta name="robots" content="noindex"/></head><body>'))
      ) {
        clientErrorMessage = `CRITICAL: Filter application failed due to a server-side configuration issue. YOU MUST CHECK YOUR FIREBASE FUNCTION LOGS for the detailed error digest. This is often related to Google AI API key, billing, or permissions in your production environment.`;
      } else {
        const displayMessage = originalMessage.length < 200 ? originalMessage : 'See server logs for full details.';
        clientErrorMessage = `Filter error: ${displayMessage} (Check Firebase Function logs for full details)`;
      }
      throw new Error(clientErrorMessage);
    }
  }
);
