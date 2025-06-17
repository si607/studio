
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Ensure the API key is loaded from environment variables
// The .env file should be automatically loaded by Next.js/dotenv in dev.ts for local development.
// For production in Firebase App Hosting, GOOGLE_API_KEY needs to be set as a secure environment variable.
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  // This console log will appear in your Firebase Function logs if the key is missing.
  console.error(
    'CRITICAL GENKIT CONFIG ERROR: GOOGLE_API_KEY environment variable is NOT SET or EMPTY. AI features WILL FAIL. Ensure this is set as a secure environment variable in your Firebase App Hosting configuration.'
  );
} else {
  // Log a portion of the key to confirm it's being read (be careful with full key logging in production for security)
  // For debugging, this can be helpful. Consider removing or obscuring more of the key for production releases.
  console.log(`Genkit initializing with GOOGLE_API_KEY. Provided key starts with: ${apiKey.substring(0, 10)}... and ends with ...${apiKey.substring(apiKey.length - 4)}`);
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey, // Explicitly pass the API key
    }),
  ],
  model: 'googleai/gemini-2.0-flash', // Default model for text, image generation uses gemini-2.0-flash-exp
});

