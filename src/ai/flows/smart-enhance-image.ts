
'use server';

/**
 * @fileOverview Smartly enhances an image, aiming for upscaling, noise reduction, and general face clarity using AI.
 * It can accept either a direct photoDataUri or an imageUrl.
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
      "A photo to be enhanced, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. If imageUrl is also provided, photoDataUri takes precedence."
    ).optional(),
  imageUrl: z
    .string()
    .url({ message: "Invalid URL provided for imageUrl" })
    .describe(
      "A public URL of a photo to be enhanced. If photoDataUri is not provided, this URL will be used to fetch the image."
    ).optional(),
}).refine(data => data.photoDataUri || data.imageUrl, {
  message: "Either photoDataUri or imageUrl must be provided.",
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
  async (input) => {
    let imageToProcessDataUri: string;

    if (input.photoDataUri) {
      imageToProcessDataUri = input.photoDataUri;
    } else if (input.imageUrl) {
      try {
        console.log(`Fetching image from URL: ${input.imageUrl}`);
        const response = await fetch(input.imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
          throw new Error(`Invalid content type from URL: ${contentType}. Expected an image.`);
        }
        const imageBuffer = await response.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        imageToProcessDataUri = `data:${contentType};base64,${base64Image}`;
        console.log(`Successfully fetched and converted image from URL. Data URI length (approx): ${imageToProcessDataUri.length}`);
      } catch (e: any) {
        console.error(
          `[smartEnhanceImageFlow] CRITICAL ERROR fetching image from URL '${input.imageUrl}'. Original error:`,
          e,
          JSON.stringify(e, Object.getOwnPropertyNames(e))
        );
        throw new Error(`Failed to fetch or process image from URL: ${input.imageUrl}. Error: ${e.message}`);
      }
    } else {
      throw new Error("No image data provided (either photoDataUri or imageUrl is required).");
    }

    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [
          {media: {url: imageToProcessDataUri}},
          {text: "Your task is an expert-level, all-in-one photo enhancement. Perform a significant upscaling of the image, aiming for at least a 4x resolution increase while creating photorealistic details—do not just enlarge pixels. Aggressively reduce digital noise and compression artifacts without losing fine textures. If human faces are present, apply professional retouching: enhance facial clarity, improve skin texture to be clear but completely natural (preserving pores), and add sparkle to the eyes. The final result must be a dramatically improved, high-definition version that looks like it was shot with a high-end camera. All enhancements must be harmonious and photorealistic. Also, discreetly incorporate a very small, semi-transparent \"PicShine AI\" watermark in one of the bottom corners of the image. Ensure it is unobtrusive and occupies minimal space."},
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
        const originalMessage = (e instanceof Error) ? e.message : String(e);
        console.error(
          `[smartEnhanceImageFlow] CRITICAL ERROR during AI generation or pre-processing. CHECK FIREBASE FUNCTION LOGS CAREFULLY. Original error:`,
          originalMessage,
          e, 
          JSON.stringify(e, Object.getOwnPropertyNames(e))
        );
        
        let clientErrorMessage = 'Photo enhancement failed due to an unexpected server error. PLEASE CHECK SERVER LOGS (e.g., Firebase Function logs) for details like a Next.js error digest or Google AI API errors.';
        const lowerMsg = originalMessage.toLowerCase();

        if (lowerMsg.includes("not available in your country") || lowerMsg.includes("image generation is not available in your country")) {
            clientErrorMessage = 'Photo enhancement failed: This AI feature is not available in your current region/country. Please check Google Cloud service availability.';
        } else if (originalMessage.startsWith('CRITICAL:') ||
            lowerMsg.includes('an error occurred in the server components render') ||
            (lowerMsg.includes("google ai") && (lowerMsg.includes("failed") || lowerMsg.includes("error"))) ||
            lowerMsg.includes('internal server error') ||
            lowerMsg.includes('failed to fetch') || 
            (lowerMsg.includes("<html") && !lowerMsg.includes("</html>") && originalMessage.length < 300 && !originalMessage.toLowerCase().includes('<html><head><meta name="robots" content="noindex"/></head><body>')))
        {
             clientErrorMessage = `CRITICAL: Photo enhancement failed due to a server-side configuration issue. YOU MUST CHECK YOUR FIREBASE FUNCTION LOGS for the detailed error digest. This is often related to Google AI API key, billing, or permissions in your production environment.`;
        } else if (lowerMsg.includes('api key not valid') || lowerMsg.includes('permission denied') || lowerMsg.includes('authentication failed') || lowerMsg.includes('api_key_not_valid')) {
            clientErrorMessage = 'Photo enhancement failed: Server configuration error (API key, permissions). Please check Firebase Function logs and contact support. Ensure GOOGLE_API_KEY is correctly set as a secure environment variable in Firebase App Hosting.';
        } else if (lowerMsg.includes('quota') || lowerMsg.includes('limit')) {
             clientErrorMessage = 'Photo enhancement failed: Service demand/quota limit reached. Please try again later. Check Firebase Function logs.';
        } else if (lowerMsg.includes('billing account not found') || lowerMsg.includes('billing') || lowerMsg.includes('project_not_linked_to_billing_account') ) {
             clientErrorMessage = 'Photo enhancement failed: Billing account issue. Please check Firebase Function logs and contact support. Ensure your Google Cloud project has an active billing account.';
        } else if (lowerMsg.includes('blocked by safety setting') || lowerMsg.includes('safety policy violation')) {
            clientErrorMessage = 'Photo enhancement failed: Image blocked by content safety policy. Try a different image.';
        } else if (lowerMsg.includes('ai model did not return an image')) {
             clientErrorMessage = originalMessage; 
        } else if (lowerMsg.includes('generative language api has not been used') || lowerMsg.includes('api is not enabled')) {
             clientErrorMessage = 'Photo enhancement failed: The Google Generative Language API is not enabled for your project or has not been used before. Please enable it in the Google Cloud Console and try again. Check Firebase Function logs for details.';
        } else if (lowerMsg.includes('failed to fetch or process image from url')) {
             clientErrorMessage = originalMessage;
        } else {
            const displayMessage = originalMessage.length < 200 ? originalMessage : 'See server logs for full details.';
            clientErrorMessage = `Enhancement error: ${displayMessage} (Check Firebase Function logs for full details)`;
        }
        throw new Error(clientErrorMessage);
      }
  }
);
    

    
