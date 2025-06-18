
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
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [
          {media: {url: input.photoDataUri}},
          {text: `Identify the primary human face in this image. Apply a '${style}' enhancement specifically to the facial features. Improve skin texture to look smooth yet natural, enhance eye clarity and sparkle, and refine details like lip definition and hair texture around the face. Ensure the enhancements blend seamlessly with the rest of the image and preserve the original character. Also, subtly incorporate a small, semi-transparent watermark "PicShine AI" in a bottom corner of the image.`},
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
        console.error(
          `[focusEnhanceFaceFlow] CRITICAL ERROR during AI generation. CHECK FIREBASE FUNCTION LOGS CAREFULLY. Look for: Next.js error digest, Google AI API error messages, API key issues, billing status, or permission problems. Original error object:`,
          e
        );
        let clientErrorMessage = 'Face-focused enhancement failed due to an unexpected server error. PLEASE CHECK SERVER LOGS (e.g., Firebase Function logs) for details like a Next.js error digest or Google AI API errors.';
        
        if (e && typeof e.message === 'string') {
            const lowerMsg = e.message.toLowerCase();
            const originalMsg = e.message;

            if (lowerMsg.includes('an error occurred in the server components render') || 
                (originalMsg.toLowerCase().includes("google ai") && originalMsg.toLowerCase().includes("failed")) ||
                lowerMsg.includes('internal server error') ||
                lowerMsg.includes('failed to fetch') ||
                (lowerMsg.includes("<html") && !lowerMsg.includes("</html>") && originalMsg.length < 300 && !originalMsg.toLowerCase().includes('<html><head><meta name="robots" content="noindex"/></head><body>')) 
            ) {
                 clientErrorMessage = `CRITICAL: Face-focused enhancement failed due to a server-side configuration issue. YOU MUST CHECK YOUR FIREBASE FUNCTION LOGS for the detailed error digest. This is often related to Google AI API key, billing, or permissions in your production environment.`;
            } else if (lowerMsg.includes('api key not valid') || lowerMsg.includes('permission denied') || lowerMsg.includes('authentication failed')) {
                clientErrorMessage = 'Face-focused enhancement: Server configuration error (API key, permissions). Check Firebase Function logs. Ensure GOOGLE_API_KEY is correctly set in Firebase App Hosting.';
            } else if (lowerMsg.includes('quota') || lowerMsg.includes('limit')) {
                 clientErrorMessage = 'Face-focused enhancement: Service demand/quota limit reached. Try again later. Check Firebase Function logs.';
            } else if (lowerMsg.includes('billing account not found') || lowerMsg.includes('billing')) {
                 clientErrorMessage = 'Face-focused enhancement: Billing account issue. Check Firebase Function logs.';
            } else if (lowerMsg.includes('blocked by safety setting') || lowerMsg.includes('safety policy violation')) {
                clientErrorMessage = 'Face-focused enhancement: Image blocked by content safety policy. Try a different image.';
            } else if (lowerMsg.includes('ai model did not return an image')) {
                 clientErrorMessage = e.message; 
            } else {
                const displayMessage = originalMsg.length < 200 ? originalMsg : 'See server logs for full details.';
                clientErrorMessage = `Face-focused enhancement error: ${displayMessage} (Check Firebase Function logs)`;
            }
        }
        throw new Error(clientErrorMessage);
      }
  }
);

    