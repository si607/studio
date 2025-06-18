
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Ensure the API key is loaded from environment variables
// The .env file is used for local development (via dotenv in dev.ts).
// For production in Firebase App Hosting, GOOGLE_API_KEY needs to be set as a secure environment variable.
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  // This console error will appear in your Firebase Function logs if the key is missing or not accessible.
  console.error(
    'CRITICAL GENKIT CONFIG ERROR: GOOGLE_API_KEY environment variable is NOT SET or EMPTY in the Firebase App Hosting environment. AI features WILL FAIL. Ensure this is set as a secure environment variable in your Firebase App Hosting configuration.'
  );
   console.log('Current process.env.GOOGLE_API_KEY value is undefined or empty.');
   console.log('All available process.env keys:', Object.keys(process.env).join(', '));

} else {
  // Log a portion of the key to confirm it's being read by the application.
  // This helps verify that the environment variable is correctly propagated to the running application.
  console.log(
    `Genkit initializing with GOOGLE_API_KEY. Provided key starts with: ${apiKey.substring(0, 10)}... and ends with ...${apiKey.substring(apiKey.length - 4)}. If AI features fail, check Firebase Function logs for errors from Google AI related to this key (e.g., billing, permissions, model access).`
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

    