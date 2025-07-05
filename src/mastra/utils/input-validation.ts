import { z } from "zod";

// Input validation schemas
export const contractCodeSchema = z.string()
  .min(1, "Contract code cannot be empty")
  .max(50000, "Contract code too large (max 50KB)")
  .refine(
    (code) => {
      // Basic Solidity validation
      const hasPragma = /pragma\s+solidity/i.test(code);
      const hasContract = /contract\s+\w+/i.test(code);
      return hasPragma || hasContract;
    },
    "Input must be valid Solidity code"
  );

export const contractNameSchema = z.string()
  .min(1, "Contract name cannot be empty")
  .max(100, "Contract name too long")
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid contract name format");

// Sanitization functions
export const sanitizeContractCode = (code: string): string => {
  // Remove potentially dangerous patterns while preserving code structure
  return code
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
};

export const sanitizeContractName = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '') // Keep only alphanumeric and underscore
    .substring(0, 100) // Limit length
    .trim();
};

// Rate limiting utilities
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 60, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

// Security utilities
export const validateAndSanitizeInput = (input: {
  contractCode?: string;
  contractName?: string;
}): { contractCode?: string; contractName?: string } => {
  const result: { contractCode?: string; contractName?: string } = {};

  if (input.contractCode) {
    const sanitized = sanitizeContractCode(input.contractCode);
    contractCodeSchema.parse(sanitized);
    result.contractCode = sanitized;
  }

  if (input.contractName) {
    const sanitized = sanitizeContractName(input.contractName);
    contractNameSchema.parse(sanitized);
    result.contractName = sanitized;
  }

  return result;
};

// Logging utilities (security-aware)
export const createSecureLogger = (level: string = 'info') => {
  const logLevels = ['error', 'warn', 'info', 'debug'];
  const currentLevel = logLevels.indexOf(level);

  return {
    error: (message: string, meta?: any) => {
      if (currentLevel >= 0) {
        console.error(`[ERROR] ${message}`, sanitizeLogMeta(meta));
      }
    },
    warn: (message: string, meta?: any) => {
      if (currentLevel >= 1) {
        console.warn(`[WARN] ${message}`, sanitizeLogMeta(meta));
      }
    },
    info: (message: string, meta?: any) => {
      if (currentLevel >= 2) {
        console.info(`[INFO] ${message}`, sanitizeLogMeta(meta));
      }
    },
    debug: (message: string, meta?: any) => {
      if (currentLevel >= 3) {
        console.debug(`[DEBUG] ${message}`, sanitizeLogMeta(meta));
      }
    }
  };
};

const sanitizeLogMeta = (meta: any): any => {
  if (!meta) return meta;
  
  // Remove sensitive information from logs
  const sanitized = { ...meta };
  
  // Remove contract code from logs
  if (sanitized.contractCode) {
    sanitized.contractCode = '[REDACTED]';
  }
  
  // Remove API keys or tokens
  if (sanitized.apiKey) {
    sanitized.apiKey = '[REDACTED]';
  }
  
  if (sanitized.token) {
    sanitized.token = '[REDACTED]';
  }
  
  return sanitized;
};