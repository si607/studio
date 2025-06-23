
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Ensure the API key is loaded from environment variables
// The .env file is used for local development (via dotenv in dev.ts).
// For production in Firebase App Hosting, GOOGLE_API_KEY needs to be set as a secure environment variable.
const apiKey = process.env.GOOGLE_API_KEY;

// Detailed check for the API key to provide better diagnostics in logs.
if (!apiKey) {
  // This console error will appear in your Firebase Function logs if the key is missing or not accessible.
  console.error(
    'CRITICAL GENKIT CONFIG ERROR: The GOOGLE_API_KEY environment variable is NOT SET or is EMPTY. All AI features WILL FAIL.'
  );
  if (process.env.K_SERVICE) { // Heuristic for running in Google Cloud environment
      console.error('This application appears to be running in a Google Cloud environment (App Hosting / Cloud Run).');
      console.error('ACTION REQUIRED: You MUST set GOOGLE_API_KEY as a secret environment variable in your Firebase App Hosting configuration.');
      console.error('See Firebase docs for "Add secrets to a web app".');
  } else {
      console.warn('This application does not appear to be in a Google Cloud environment. For local development, ensure you have a .env file with GOOGLE_API_KEY set.');
  }
} else {
  // Log a portion of the key to confirm it's being read by the application.
  // This helps verify that the environment variable is correctly propagated to the running application.
  console.log(
    `Genkit initializing with GOOGLE_API_KEY. Key starts with: ${apiKey.substring(0, 4)}... and ends with ...${apiKey.substring(apiKey.length - 4)}.`
  );
  console.log('If AI features fail with this key, CHECK FIREBASE FUNCTION LOGS for errors from the Google AI API related to this key (e.g., billing not enabled, API not enabled, permissions issues, or incorrect model name).');
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey, // Explicitly pass the API key
    }),
  ],
  model: 'googleai/gemini-2.0-flash', // Default model for text, image generation specifies its own model
});
