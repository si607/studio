
import { config } from 'dotenv';
config();

// import '@/ai/flows/suggest-improvements.ts'; // Removed as per new requirements
import '@/ai/flows/smart-enhance-image.ts'; // Renamed from enhance-image.ts
import '@/ai/flows/colorize-image.ts'; // Added new flow
