
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Ensure the API key is loaded from environment variables
// The .env file should be automatically loaded by Next.js/dotenv in dev.ts
// For production in Firebase App Hosting, GOOGLE_API_KEY needs to be set as an environment variable.
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'production') {
  // This console log will appear in your Firebase Function logs if the key is missing in production.
  console.warn(
    'GOOGLE_API_KEY environment variable is not set in production. AI features will likely fail.'
  );
}


export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey, // Explicitly pass the API key
    }),
  ],
  model: 'googleai/gemini-2.0-flash', // Default model for text, image generation uses gemini-2.0-flash-exp
});
