import dotenv from "dotenv";
import { createOllama } from "ollama-ai-provider";
import type { LanguageModelV1 } from "@ai-sdk/provider";

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

// Timeout configuration - increased for complex analysis
export const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT ?? '120000', 10); // 2 minutes
export const modelTimeout = parseInt(process.env.MODEL_TIMEOUT ?? '90000', 10); // 1.5 minutes

// Validate configuration
if (isNaN(maxRequestsPerMinute) || maxRequestsPerMinute <= 0) {
  throw new Error('MAX_REQUESTS_PER_MINUTE must be a positive number');
}

if (isNaN(requestTimeout) || requestTimeout <= 0) {
  throw new Error('REQUEST_TIMEOUT must be a positive number');
}

// Create and export the model instance with improved error handling and timeouts
let model: LanguageModelV1;
try {
  const ollamaProvider = createOllama({ 
    baseURL,
    // Enhanced fetch with proper timeout and retry logic
    fetch: async (url, options) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`Request timeout after ${modelTimeout}ms for URL: ${url}`);
        controller.abort();
      }, modelTimeout);
      
      let lastError: Error | unknown;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);
          
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              ...options?.headers,
              'Content-Type': 'application/json',
            },
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          return response;
        } catch (error) {
          lastError = error;
          console.warn(`Attempt ${attempt} failed:`, error instanceof Error ? error.message : 'Unknown error');
          
          if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      clearTimeout(timeoutId);
      throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
    }
  });

  // Create the chat model with proper settings
  model = ollamaProvider.chat(modelName, {
    simulateStreaming: true,
    // Remove unsupported properties and use only valid ones
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
console.log(`- Request Timeout: ${requestTimeout}ms`);
console.log(`- Model Timeout: ${modelTimeout}ms`);
console.log(`- Log Level: ${logLevel}`);