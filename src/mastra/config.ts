import dotenv from "dotenv";
import { createOllama } from "ollama-ai-provider";
import type { LanguageModelV1 } from "ai";

dotenv.config();

const requiredEnvVars = ["MODEL_NAME_AT_ENDPOINT", "API_BASE_URL"];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.warn(
    `Warning: Missing environment variables: ${missingEnvVars.join(", ")}`
  );
  console.warn(
    "Using default values. Check your .env file for production deployment."
  );
}


export const modelName = process.env.MODEL_NAME_AT_ENDPOINT ?? "qwen2.5:1.5b";
export const baseURL = process.env.API_BASE_URL ?? "http://127.0.0.1:11434/api";

export const enableRateLimiting = process.env.ENABLE_RATE_LIMITING === "true";
export const maxRequestsPerMinute = parseInt(
  process.env.MAX_REQUESTS_PER_MINUTE ?? "60",
  10
);
export const logLevel = process.env.LOG_LEVEL ?? "info";
export const nodeEnv = process.env.NODE_ENV ?? "development";

export const requestTimeout = parseInt(
  process.env.REQUEST_TIMEOUT ?? "60000",
  10
); 
export const modelTimeout = parseInt(process.env.MODEL_TIMEOUT ?? "45000", 10); 

if (isNaN(maxRequestsPerMinute) || maxRequestsPerMinute <= 0) {
  throw new Error("MAX_REQUESTS_PER_MINUTE must be a positive number");
}

if (isNaN(requestTimeout) || requestTimeout <= 0) {
  throw new Error("REQUEST_TIMEOUT must be a positive number");
}

const checkOllamaHealth = async (): Promise<boolean> => {
  try {
    // For external endpoints, do a simple connectivity check
    if (baseURL.includes('nosana.com')) {
      const response = await fetch(baseURL, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000),
      });
      return response.status < 500; // Accept any non-server error
    }
    
    // For local Ollama
    const healthUrl = baseURL.includes('/api') ? baseURL.replace("/api", "") + "/api/tags" : baseURL + "/api/tags";
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000), 
    });
    return response.ok;
  } catch (error) {
    console.error(
      "Ollama health check failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return false;
  }
};

const checkModelAvailability = async (): Promise<boolean> => {
  try {
    // Skip model availability check for external endpoints
    if (baseURL.includes('nosana.com')) {
      console.log('Using external Nosana endpoint - skipping model availability check');
      return true;
    }
    
    const modelsUrl = baseURL.replace("/api", "") + "/api/tags";
    const response = await fetch(modelsUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return false;

    const data = await response.json();
    const availableModels = data.models || [];
    const modelExists = availableModels.some(
      (model: any) =>
        model.name === modelName ||
        model.name.startsWith(modelName.split(":")[0])
    );

    if (!modelExists) {
      console.warn(
        `Model ${modelName} not found. Available models:`,
        availableModels.map((m: any) => m.name).join(", ")
      );
    }

    return modelExists;
  } catch (error) {
    console.error(
      "Model availability check failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return false;
  }
};

let model: LanguageModelV1;

const initializeModel = async () => {
  try {
 
    console.log("Checking Ollama connection...");
    const isHealthy = await checkOllamaHealth();

    if (!isHealthy) {
      throw new Error(
        `Ollama is not running or not accessible at ${baseURL}. Please start Ollama first.`
      );
    }

    console.log("Ollama is running");

    console.log(`Checking if model ${modelName} is available...`);
    const modelAvailable = await checkModelAvailability();

    if (!modelAvailable) {
      console.warn(` Model ${modelName} not found. Attempting to pull...`);
    }

    const ollamaProvider = createOllama({
      baseURL,
      fetch: async (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`⏰ Request timeout after ${modelTimeout}ms for ${url}`);
          controller.abort();
        }, modelTimeout);

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              ...options?.headers,
            },
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response
              .text()
              .catch(() => "Unknown error");
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          return response;
        } catch (error) {
          clearTimeout(timeoutId);

          if (error instanceof Error) {
            if (error.name === "AbortError") {
              throw new Error(
                `Request timed out after ${modelTimeout}ms. The model might be too large or Ollama is overloaded.`
              );
            }
            throw error;
          }
          throw new Error("Unknown fetch error");
        }
      },
    });

    model = ollamaProvider.chat(modelName, {
    });

    console.log(" Model initialized successfully");
  } catch (error) {
    console.error(" Failed to initialize model:", error);
    throw new Error(
      `Model initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

try {
  const ollamaProvider = createOllama({ baseURL });
  model = ollamaProvider.chat(modelName);
} catch (error) {
  console.error("Failed to initialize model:", error);
  throw new Error(
    `Model initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
  );
}

export { model, initializeModel, checkOllamaHealth, checkModelAvailability };

console.log(`Configuration loaded:`);
console.log(`- Model: ${modelName}`);
console.log(`- Base URL: ${baseURL.replace(/\/\/.*@/, "//***@")}`); 
console.log(`- Environment: ${nodeEnv}`);
console.log(`- Rate Limiting: ${enableRateLimiting ? "Enabled" : "Disabled"}`);
console.log(`- Request Timeout: ${requestTimeout}ms`);
console.log(`- Model Timeout: ${modelTimeout}ms`);
console.log(`- Log Level: ${logLevel}`);
