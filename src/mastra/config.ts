import dotenv from "dotenv";
import { createOllama } from "ollama-ai-provider";

// Load environment variables once at the beginning
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MODEL_NAME_AT_ENDPOINT', 'API_BASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn(`Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('Using default values. Check your .env file for production deployment.');
}

// Export all your environment variables with secure defaults
// Defaults to Ollama qwen2.5:1.5b
// https://ollama.com/library/qwen2.5
export const modelName = process.env.MODEL_NAME_AT_ENDPOINT ?? "qwen2.5:1.5b";
export const baseURL = process.env.API_BASE_URL ?? "http://127.0.0.1:11434/api";

// Security configuration
export const enableRateLimiting = process.env.ENABLE_RATE_LIMITING === 'true';
export const maxRequestsPerMinute = parseInt(process.env.MAX_REQUESTS_PER_MINUTE ?? '60', 10);
export const logLevel = process.env.LOG_LEVEL ?? 'info';
export const nodeEnv = process.env.NODE_ENV ?? 'development';

// Validate configuration
if (isNaN(maxRequestsPerMinute) || maxRequestsPerMinute <= 0) {
  throw new Error('MAX_REQUESTS_PER_MINUTE must be a positive number');
}

// Create and export the model instance with error handling
let model;
try {
  model = createOllama({ 
    baseURL,
    // Add timeout and retry configuration for production
    fetch: async (url, options) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }
  }).chat(modelName, {
    simulateStreaming: true,
  });
} catch (error) {
  console.error('Failed to initialize model:', error);
  throw new Error(`Model initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

export { model };

// Log configuration (without sensitive data)
console.log(`Configuration loaded:`);
console.log(`- Model: ${modelName}`);
console.log(`- Base URL: ${baseURL.replace(/\/\/.*@/, '//***@')}`); // Hide credentials in URL
console.log(`- Environment: ${nodeEnv}`);
console.log(`- Rate Limiting: ${enableRateLimiting ? 'Enabled' : 'Disabled'}`);
console.log(`- Log Level: ${logLevel}`);