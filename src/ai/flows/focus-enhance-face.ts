
'use server';
/**
 * @fileOverview Enhances facial features in an image based on a specified style.
 *
 * - focusEnhanceFace - A function that enhances facial features in an image.
 * - FocusEnhanceFaceInput - The input type for the focusEnhanceFace function.
 * - FocusEnhanceFaceOutput - The return type for the focusEnhanceFace function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const FocusEnhanceFaceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be enhanced, focusing on facial features, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  enhancementStyle: z.string().describe("The desired style for facial enhancement (e.g., 'natural clarity', 'artistic detail', 'soft glow'). Defaults to 'natural clarity' if not provided."),
});
export type FocusEnhanceFaceInput = z.infer<typeof FocusEnhanceFaceInputSchema>;

const FocusEnhanceFaceOutputSchema = z.object({
  enhancedPhotoDataUri: z
    .string()
    .describe(
      'The photo with enhanced facial features, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type FocusEnhanceFaceOutput = z.infer<typeof FocusEnhanceFaceOutputSchema>;

export async function focusEnhanceFace(input: FocusEnhanceFaceInput): Promise<FocusEnhanceFaceOutput> {
  return focusEnhanceFaceFlow(input);
}

const focusEnhanceFaceFlow = ai.defineFlow(
  {
    name: 'focusEnhanceFaceFlow',
    inputSchema: FocusEnhanceFaceInputSchema,
    outputSchema: FocusEnhanceFaceOutputSchema,
  },
  async input => {
    try {
      const style = input.enhancementStyle || 'natural clarity';
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: [
          {media: {url: input.photoDataUri}},
          {text: `You are a specialized AI digital photo restoration expert. Your primary, non-negotiable task is to enhance the clarity of the main human face in this image while **STRICTLY PRESERVING the person's original identity and facial structure.** Any change to the shape, size, or position of facial features is a failure.

Follow these instructions with extreme precision:

1.  **Identify Primary Face:** Accurately locate the main human face in the image.

2.  **Clarity Enhancement (NOT Alteration):** Analyze the existing features—eyes, nose, mouth—and improve their sharpness and clarity. **DO NOT** change their shape, size, or position in any way. For example, enhance the sparkle in the eyes, but do not change the eye shape or color.

3.  **Skin Texture Correction (NOT Smoothing):** Gently reduce minor blemishes, redness, or compression artifacts. It is **CRITICAL** to preserve the natural skin texture and pores. The result must not look plastic, waxy, or artificially smooth. Your goal is to clean, not to 'beautify' by altering structure.

4.  **Strict Identity Preservation (Reiteration):** This is the most important rule. The output must be recognizable as the exact same person. Under no circumstances should the final image look like a different person or even a slightly altered version of the original person. Preserve the exact bone structure, feature shapes, and unique characteristics. Do not change the shape of the jawline, nose, eyes, or lips.

5.  **Watermark:** Discreetly incorporate a very small, semi-transparent "PicShine AI" watermark in one of the bottom corners of the image. Ensure it is unobtrusive and occupies minimal space.`},
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
        throw new Error('AI model did not return an image for face-focused enhancement. This could be due to content safety filters, an issue with the input image, or a temporary model problem. Try a different image or style.');
      }
      return {enhancedPhotoDataUri: media.url};
    } catch (e: any) {
        const originalMessage = (e instanceof Error) ? e.message : String(e);
        console.error(
          `[focusEnhanceFaceFlow] CRITICAL ERROR during AI generation. CHECK FIREBASE FUNCTION LOGS CAREFULLY. Look for: Next.js error digest, Google AI API error messages (API key, billing, permissions), quota issues, or model access problems. Original error object:`,
          e,
          JSON.stringify(e, Object.getOwnPropertyNames(e))
        );
        
        let clientErrorMessage = 'Face-focused enhancement failed due to an unexpected server error. PLEASE CHECK SERVER LOGS (e.g., Firebase Function logs) for details like a Next.js error digest or Google AI API errors.';
        const lowerMsg = originalMessage.toLowerCase();
        
        if (lowerMsg.includes('api key not valid') || lowerMsg.includes('permission denied') || lowerMsg.includes('authentication failed') || lowerMsg.includes('api_key_not_valid')) {
            clientErrorMessage = 'Face-focused enhancement: Server configuration error (API key, permissions). Check Firebase Function logs. Ensure GOOGLE_API_KEY is correctly set in Firebase App Hosting.';
        } else if (lowerMsg.includes('billing account not found') || lowerMsg.includes('billing') || lowerMsg.includes('project_not_linked_to_billing_account')) {
             clientErrorMessage = 'Face-focused enhancement: Billing account issue. Check Firebase Function logs. Ensure your Google Cloud project has an active billing account.';
        } else if (lowerMsg.includes('generative language api has not been used') || lowerMsg.includes('api is not enabled')) {
             clientErrorMessage = 'Face-focused enhancement failed: The Google Generative Language API is not enabled for your project or has not been used before. Please enable it in the Google Cloud Console and try again. Check Firebase Function logs for details.';
        } else if (lowerMsg.includes("not available in your country") || lowerMsg.includes("image generation is not available in your country")) {
            clientErrorMessage = 'Face-focused enhancement failed: This AI feature is not available in your current region/country. Please check Google Cloud service availability.';
        } else if (lowerMsg.includes('quota') || lowerMsg.includes('limit')) {
             clientErrorMessage = 'Face-focused enhancement: Service demand/quota limit reached. Try again later. Check Firebase Function logs.';
        } else if (lowerMsg.includes('blocked by safety setting') || lowerMsg.includes('safety policy violation')) {
            clientErrorMessage = 'Face-focused enhancement: Image blocked by content safety policy. Try a different image.';
        } else if (lowerMsg.includes('ai model did not return an image')) {
             clientErrorMessage = originalMessage; 
        } else if (originalMessage.startsWith('CRITICAL:') ||
            lowerMsg.includes('an error occurred in the server components render') || 
            (lowerMsg.includes("google ai") && lowerMsg.includes("failed")) ||
            lowerMsg.includes('internal server error') ||
            lowerMsg.includes('failed to fetch') ||
            (lowerMsg.includes("<html") && !lowerMsg.includes("</html>") && originalMessage.length < 300 && !originalMessage.toLowerCase().includes('<html><head><meta name="robots" content="noindex"/></head><body>')) 
        ) {
             clientErrorMessage = `CRITICAL: Face-focused enhancement failed due to a server-side configuration issue. YOU MUST CHECK YOUR FIREBASE FUNCTION LOGS for the detailed error digest. This is often related to Google AI API key, billing, or permissions in your production environment.`;
        } else {
            const displayMessage = originalMessage.length < 200 ? originalMessage : 'See server logs for full details.';
            clientErrorMessage = `Face-focused enhancement error: ${displayMessage} (Check Firebase Function logs)`;
        }
        throw new Error(clientErrorMessage);
      }
  }
);
