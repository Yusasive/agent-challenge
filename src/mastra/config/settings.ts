import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Configuration schema with validation
const configSchema = z.object({
  // Model Configuration
  modelName: z.string().default("qwen2.5:1.5b"),
  apiBaseUrl: z.string().url().default("http://127.0.0.1:11500/api"),
  
  // Server Configuration
  port: z.number().int().min(1).max(65535).default(8080),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  
  // Timeout Configuration (in milliseconds)
  timeouts: z.object({
    request: z.number().int().min(1000).max(300000).default(30000), 
    model: z.number().int().min(1000).max(180000).default(25000),   
    analysis: z.number().int().min(5000).max(600000).default(120000), 
    verification: z.number().int().min(10000).max(1800000).default(60000),  
  }),
  
  // Security Configuration
  security: z.object({
    enableRateLimiting: z.boolean().default(false),
    maxRequestsPerMinute: z.number().int().min(1).max(1000).default(60),
    maxContractSize: z.number().int().min(1000).max(1000000).default(50000), 
    enableInputSanitization: z.boolean().default(true),
  }),
  
  // Analysis Configuration
  analysis: z.object({
    maxAnalysisDepth: z.enum(["basic", "intermediate", "deep"]).default("intermediate"),
    enableAdvancedAnalysis: z.boolean().default(true),
    enableMLDetection: z.boolean().default(true),
    enableFormalVerification: z.boolean().default(true),
    mlSensitivity: z.enum(["low", "medium", "high"]).default("medium"),
  }),
  
  // Logging Configuration
  logging: z.object({
    level: z.enum(["error", "warn", "info", "debug"]).default("info"),
    enableFileLogging: z.boolean().default(false),
    logDirectory: z.string().default("./logs"),
    maxLogFiles: z.number().int().min(1).max(100).default(10),
  }),
  
  // Performance Configuration
  performance: z.object({
    maxConcurrentAnalysis: z.number().int().min(1).max(10).default(3),
    enableCaching: z.boolean().default(true),
    cacheTimeout: z.number().int().min(60000).max(3600000).default(300000), // 5min
  }),
});

// Parse and validate configuration
const parseConfig = () => {
  const rawConfig = {
   
    modelName: process.env.MODEL_NAME_AT_ENDPOINT,
    apiBaseUrl: process.env.API_BASE_URL,
    
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    nodeEnv: process.env.NODE_ENV,
  
    timeouts: {
      request: process.env.REQUEST_TIMEOUT ? parseInt(process.env.REQUEST_TIMEOUT, 10) : undefined,
      model: process.env.MODEL_TIMEOUT ? parseInt(process.env.MODEL_TIMEOUT, 10) : undefined,
      analysis: process.env.ANALYSIS_TIMEOUT ? parseInt(process.env.ANALYSIS_TIMEOUT, 10) : undefined,
      verification: process.env.VERIFICATION_TIMEOUT ? parseInt(process.env.VERIFICATION_TIMEOUT, 10) : undefined,
    },
  
    security: {
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING === "true",
      maxRequestsPerMinute: process.env.MAX_REQUESTS_PER_MINUTE ? parseInt(process.env.MAX_REQUESTS_PER_MINUTE, 10) : undefined,
      maxContractSize: process.env.MAX_CONTRACT_SIZE ? parseInt(process.env.MAX_CONTRACT_SIZE, 10) : undefined,
      enableInputSanitization: process.env.ENABLE_INPUT_SANITIZATION !== "false",
    },
 
    analysis: {
      maxAnalysisDepth: process.env.MAX_ANALYSIS_DEPTH as "basic" | "intermediate" | "deep",
      enableAdvancedAnalysis: process.env.ENABLE_ADVANCED_ANALYSIS !== "false",
      enableMLDetection: process.env.ENABLE_ML_DETECTION !== "false",
      enableFormalVerification: process.env.ENABLE_FORMAL_VERIFICATION !== "false",
      mlSensitivity: process.env.ML_SENSITIVITY as "low" | "medium" | "high",
    },
   
    logging: {
      level: process.env.LOG_LEVEL as "error" | "warn" | "info" | "debug",
      enableFileLogging: process.env.ENABLE_FILE_LOGGING === "true",
      logDirectory: process.env.LOG_DIRECTORY,
      maxLogFiles: process.env.MAX_LOG_FILES ? parseInt(process.env.MAX_LOG_FILES, 10) : undefined,
    },
 
    performance: {
      maxConcurrentAnalysis: process.env.MAX_CONCURRENT_ANALYSIS ? parseInt(process.env.MAX_CONCURRENT_ANALYSIS, 10) : undefined,
      enableCaching: process.env.ENABLE_CACHING !== "false",
      cacheTimeout: process.env.CACHE_TIMEOUT ? parseInt(process.env.CACHE_TIMEOUT, 10) : undefined,
    },
  };

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    console.error(" Configuration validation failed:");
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error("Invalid configuration. Please check your environment variables.");
  }
};

export const config = parseConfig();

export const {
  modelName,
  apiBaseUrl,
  port,
  nodeEnv,
  timeouts,
  security,
  analysis,
  logging,
  performance,
} = config;

export const validateConfig = () => {
  console.log(" Configuration loaded successfully:");
  console.log(`  - Environment: ${nodeEnv}`);
  console.log(`  - Model: ${modelName}`);
  console.log(`  - Port: ${port}`);
  console.log(`  - Rate Limiting: ${security.enableRateLimiting ? 'Enabled' : 'Disabled'}`);
  console.log(`  - Advanced Analysis: ${analysis.enableAdvancedAnalysis ? 'Enabled' : 'Disabled'}`);
  console.log(`  - ML Detection: ${analysis.enableMLDetection ? 'Enabled' : 'Disabled'}`);
  console.log(`  - Formal Verification: ${analysis.enableFormalVerification ? 'Enabled' : 'Disabled'}`);
  console.log(`  - Log Level: ${logging.level}`);
  
  return config;
};

export const isDevelopment = nodeEnv === "development";
export const isProduction = nodeEnv === "production";
export const isTest = nodeEnv === "test";

export const getTimeout = (type: keyof typeof timeouts): number => {
  return timeouts[type];
};

export const isFeatureEnabled = (feature: keyof typeof analysis): boolean => {
  return analysis[feature] as boolean;
};

export const getSecuritySetting = (setting: keyof typeof security): any => {
  return security[setting];
};