
import { config } from 'dotenv';
config();

// import '@/ai/flows/suggest-improvements.ts'; // Removed as per new requirements
import '@/ai/flows/smart-enhance-image.ts'; 
import '@/ai/flows/colorize-image.ts'; 
import '@/ai/flows/remove-scratches.ts'; 
import '@/ai/flows/focus-enhance-face.ts'; // Added new flow for face-focused enhancement

