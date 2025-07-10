import { createOllama } from "ollama-ai-provider";
import type { LanguageModelV1 } from "ai";
import { 
  config, 
  modelName, 
  apiBaseUrl as baseURL, 
  timeouts,
  validateConfig 
} from "./config/settings";

// Validate configuration on startup
validateConfig();

// Export commonly used values for backward compatibility
export const enableRateLimiting = config.security.enableRateLimiting;
export const maxRequestsPerMinute = config.security.maxRequestsPerMinute;
export const logLevel = config.logging.level;
export const nodeEnv = config.nodeEnv;
export const requestTimeout = timeouts.request;
export const modelTimeout = timeouts.model;
export const analysisTimeout = timeouts.analysis;
export const verificationTimeout = timeouts.verification;

// Export the full config for advanced usage
export { config };

const checkOllamaHealth = async (): Promise<boolean> => {
  try {
    const healthUrl = baseURL.replace("/api", "") + "/api/tags";
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
console.log(`- Analysis Timeout: ${analysisTimeout}ms`);
console.log(`- Verification Timeout: ${verificationTimeout}ms`);
console.log(`- Log Level: ${logLevel}`);
