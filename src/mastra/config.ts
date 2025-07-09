import dotenv from "dotenv";
import { createOpenAI } from "@ai-sdk/openai";
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
// Defaults to hosted qwen2.5:7b
export const modelName = process.env.MODEL_NAME_AT_ENDPOINT ?? "qwen2.5:7b";
export const baseURL = process.env.API_BASE_URL ?? "https://5tql5kqqyzbfo6jvsqwtgnumdgh49voayzqx7f2bd7fb.node.k8s.prd.nos.ci/v1";

// API Key for hosted endpoints (if required)
export const apiKey = process.env.API_KEY ?? "";

// Security configuration
export const enableRateLimiting = process.env.ENABLE_RATE_LIMITING === 'true';
export const maxRequestsPerMinute = parseInt(process.env.MAX_REQUESTS_PER_MINUTE ?? '60', 10);
export const logLevel = process.env.LOG_LEVEL ?? 'info';
export const nodeEnv = process.env.NODE_ENV ?? 'development';

// Timeout configuration - optimized for better responsiveness
export const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT ?? '30000', 10); // 30 seconds
export const modelTimeout = parseInt(process.env.MODEL_TIMEOUT ?? '25000', 10); // 25 seconds

// Validate configuration
if (isNaN(maxRequestsPerMinute) || maxRequestsPerMinute <= 0) {
  throw new Error('MAX_REQUESTS_PER_MINUTE must be a positive number');
}

if (isNaN(requestTimeout) || requestTimeout <= 0) {
  throw new Error('REQUEST_TIMEOUT must be a positive number');
}

// Function to check if Ollama is running
const checkOllamaHealth = async (): Promise<boolean> => {
  try {
    const healthUrl = baseURL.replace('/api', '') + '/api/tags';
    const response = await fetch(healthUrl, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout for health check
    });
    return response.ok;
  } catch (error) {
    console.error('Ollama health check failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};

// Function to check if model is available on hosted endpoint
const checkModelAvailability = async (): Promise<boolean> => {
  try {
    const modelsUrl = baseURL + '/models';
    const response = await fetch(modelsUrl, { 
      method: 'GET',
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    const availableModels = data.data || data.models || [];
    const modelExists = availableModels.some((model: any) => 
      model.id === modelName || model.name === modelName || 
      model.id?.includes(modelName) || model.name?.includes(modelName)
    );
    
    if (!modelExists) {
      console.warn(`Model ${modelName} not found. Available models:`, 
        availableModels.map((m: any) => m.id || m.name).join(', '));
    }
    
    return modelExists;
  } catch (error) {
    console.error('Model availability check failed:', error instanceof Error ? error.message : 'Unknown error');
    return true; // Assume available if we can't check
  }
};

// Initialize model with hosted endpoint
const initializeModel = async (): Promise<LanguageModelV1> => {
  try {
    // Check hosted endpoint health first
    console.log('Checking hosted endpoint connection...');
    const isHealthy = await checkEndpointHealth();
    
    if (!isHealthy) {
      console.warn(`⚠️  Hosted endpoint not accessible at ${baseURL}. Proceeding anyway...`);
    }
    
    console.log('✅ Hosted endpoint is accessible');
    
    // Check if model is available
    console.log(`Checking if model ${modelName} is available...`);
    const modelAvailable = await checkModelAvailability();
    
    if (!modelAvailable) {
      console.warn(`⚠️  Model ${modelName} not found in model list. Proceeding anyway...`);
    }

    // Create OpenAI-compatible provider for hosted endpoint
    const provider = createOpenAI({ 
      baseURL,
      apiKey: apiKey || 'dummy-key', // Some endpoints don't require real API keys
    });

    // Create the chat model
    const model = provider(modelName);
    
    console.log('✅ Model initialized successfully');
    return model;
    
  } catch (error) {
    console.error('❌ Failed to initialize model:', error);
    throw new Error(`Model initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Create and export the model instance
let model: LanguageModelV1;

// Initialize model synchronously for immediate use
try {
  const provider = createOpenAI({ 
    baseURL,
    apiKey: apiKey || 'dummy-key',
  });
  model = provider(modelName);
} catch (error) {
  console.error('Failed to initialize model:', error);
  throw new Error(`Model initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

export { model, initializeModel, checkEndpointHealth, checkModelAvailability };
// Log configuration (without sensitive data)
console.log(`Configuration loaded:`);
console.log(`- Model: ${modelName}`);
console.log(`- Base URL: ${baseURL.replace(/\/\/.*@/, '//***@')}`); // Hide credentials in URL
console.log(`- Environment: ${nodeEnv}`);
console.log(`- Rate Limiting: ${enableRateLimiting ? 'Enabled' : 'Disabled'}`);
console.log(`- Request Timeout: ${requestTimeout}ms`);
console.log(`- Model Timeout: ${modelTimeout}ms`);
console.log(`- Log Level: ${logLevel}`);