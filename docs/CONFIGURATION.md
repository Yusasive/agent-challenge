# Configuration Guide

This document provides comprehensive information about configuring the Smart Contract Auditor Agent.

<<<<<<< HEAD
##  Table of Contents
=======
## 📋 Table of Contents
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

- [Environment Variables](#environment-variables)
- [Configuration Schema](#configuration-schema)
- [Environment-Specific Configs](#environment-specific-configs)
- [Advanced Configuration](#advanced-configuration)
- [Validation and Troubleshooting](#validation-and-troubleshooting)

<<<<<<< HEAD
##  Environment Variables
=======
## 🔧 Environment Variables
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

### Core Configuration

```bash
# Model Configuration
MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b          # LLM model to use
API_BASE_URL=http://127.0.0.1:11500/api      # Ollama API endpoint

# Server Configuration
PORT=8080                                     # Server port
NODE_ENV=development                          # Environment (development/production/test)
```

### Timeout Configuration

```bash
# Timeout settings (in milliseconds)
REQUEST_TIMEOUT=30000                         # Overall request timeout (30s)
MODEL_TIMEOUT=25000                           # LLM model response timeout (25s)
ANALYSIS_TIMEOUT=120000                       # Contract analysis timeout (2min)
VERIFICATION_TIMEOUT=60000                    # Formal verification timeout (1min)
```

### Security Configuration

```bash
# Security settings
ENABLE_RATE_LIMITING=false                    # Enable/disable rate limiting
MAX_REQUESTS_PER_MINUTE=60                    # Rate limit threshold
MAX_CONTRACT_SIZE=50000                       # Max contract size in bytes (50KB)
ENABLE_INPUT_SANITIZATION=true               # Enable input sanitization
```

### Analysis Configuration

```bash
# Analysis behavior
MAX_ANALYSIS_DEPTH=intermediate               # Analysis depth (basic/intermediate/deep)
ENABLE_ADVANCED_ANALYSIS=true                # Enable advanced static analysis
ENABLE_ML_DETECTION=true                     # Enable ML-based anomaly detection
ENABLE_FORMAL_VERIFICATION=true             # Enable formal verification
ML_SENSITIVITY=medium                        # ML sensitivity (low/medium/high)
```

### Logging Configuration

```bash
# Logging settings
LOG_LEVEL=info                               # Log level (error/warn/info/debug)
ENABLE_FILE_LOGGING=false                   # Enable file-based logging
LOG_DIRECTORY=./logs                         # Log file directory
MAX_LOG_FILES=10                            # Maximum log files to keep
```

### Performance Configuration

```bash
# Performance tuning
MAX_CONCURRENT_ANALYSIS=3                    # Max concurrent analyses
ENABLE_CACHING=true                         # Enable result caching
CACHE_TIMEOUT=300000                        # Cache timeout (5min)
```

<<<<<<< HEAD
##  Configuration Schema
=======
## 📝 Configuration Schema
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

The configuration uses Zod for validation. Here's the complete schema:

```typescript
const configSchema = z.object({
  // Model Configuration
  modelName: z.string().default("qwen2.5:1.5b"),
  apiBaseUrl: z.string().url().default("http://127.0.0.1:11500/api"),
  
  // Server Configuration
  port: z.number().int().min(1).max(65535).default(8080),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  
  // Timeout Configuration (milliseconds)
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
    cacheTimeout: z.number().int().min(60000).max(3600000).default(300000),
  }),
});
```

<<<<<<< HEAD
##  Environment-Specific Configs
=======
## 🌍 Environment-Specific Configs
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

### Development Environment

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_RATE_LIMITING=false
MAX_ANALYSIS_DEPTH=intermediate
ENABLE_ADVANCED_ANALYSIS=true
ENABLE_ML_DETECTION=true
ENABLE_FORMAL_VERIFICATION=true
REQUEST_TIMEOUT=30000
ANALYSIS_TIMEOUT=120000
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_MINUTE=30
MAX_ANALYSIS_DEPTH=deep
ENABLE_ADVANCED_ANALYSIS=true
ENABLE_ML_DETECTION=true
ENABLE_FORMAL_VERIFICATION=true
REQUEST_TIMEOUT=60000
ANALYSIS_TIMEOUT=300000
VERIFICATION_TIMEOUT=180000
ENABLE_FILE_LOGGING=true
MAX_CONCURRENT_ANALYSIS=5
```

### Testing Environment

```bash
# .env.test
NODE_ENV=test
LOG_LEVEL=error
ENABLE_RATE_LIMITING=false
MAX_ANALYSIS_DEPTH=basic
ENABLE_ADVANCED_ANALYSIS=false
ENABLE_ML_DETECTION=false
ENABLE_FORMAL_VERIFICATION=false
REQUEST_TIMEOUT=10000
ANALYSIS_TIMEOUT=30000
MAX_CONCURRENT_ANALYSIS=1
```

<<<<<<< HEAD
##  Advanced Configuration
=======
## ⚙️ Advanced Configuration
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

### Custom Model Configuration

```bash
# Using different models
MODEL_NAME_AT_ENDPOINT=qwen2.5:7b            # Larger model for better accuracy
MODEL_NAME_AT_ENDPOINT=qwen2.5:32b           # Largest model for production

# External API configuration
MODEL_NAME_AT_ENDPOINT=gpt-4
API_BASE_URL=https://api.openai.com/v1
```

### Performance Tuning

```bash
# High-performance configuration
MAX_CONCURRENT_ANALYSIS=8                    # More concurrent analyses
ENABLE_CACHING=true                         # Enable aggressive caching
CACHE_TIMEOUT=1800000                       # 30-minute cache
REQUEST_TIMEOUT=120000                      # Longer timeouts for complex analysis
ANALYSIS_TIMEOUT=600000                     # 10-minute analysis timeout
```

### Security Hardening

```bash
# Production security settings
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_MINUTE=20                  # Strict rate limiting
MAX_CONTRACT_SIZE=25000                     # Smaller max contract size
ENABLE_INPUT_SANITIZATION=true             # Always sanitize inputs
LOG_LEVEL=warn                             # Reduce log verbosity
ENABLE_FILE_LOGGING=true                   # Enable audit logging
```

### Analysis Customization

```bash
# Deep analysis configuration
MAX_ANALYSIS_DEPTH=deep                     # Most thorough analysis
ENABLE_ADVANCED_ANALYSIS=true              # Enable all advanced features
ENABLE_ML_DETECTION=true                   # Enable ML anomaly detection
ENABLE_FORMAL_VERIFICATION=true           # Enable formal verification
ML_SENSITIVITY=high                        # High sensitivity for ML detection
VERIFICATION_TIMEOUT=300000                # 5-minute verification timeout
```

<<<<<<< HEAD
## Validation and Troubleshooting
=======
## 🔍 Validation and Troubleshooting
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

### Configuration Validation

```bash
# Validate configuration
npm run validate-config
```

This will check:
- All required environment variables are set
- Values are within valid ranges
- Types are correct
- Dependencies are satisfied

### Common Configuration Issues

#### 1. Invalid Timeout Values

```bash
<<<<<<< HEAD
#  Invalid - too short
REQUEST_TIMEOUT=500

#  Valid - minimum 1 second
=======
# ❌ Invalid - too short
REQUEST_TIMEOUT=500

# ✅ Valid - minimum 1 second
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab
REQUEST_TIMEOUT=1000
```

#### 2. Invalid Port Numbers

```bash
<<<<<<< HEAD
#  Invalid - port out of range
PORT=70000

#  Valid - standard port
=======
# ❌ Invalid - port out of range
PORT=70000

# ✅ Valid - standard port
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab
PORT=8080
```

#### 3. Invalid Analysis Depth

```bash
<<<<<<< HEAD
#  Invalid - unknown depth
MAX_ANALYSIS_DEPTH=ultra

#  Valid - supported depth
=======
# ❌ Invalid - unknown depth
MAX_ANALYSIS_DEPTH=ultra

# ✅ Valid - supported depth
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab
MAX_ANALYSIS_DEPTH=deep
```

### Configuration Debugging

Enable debug logging to see configuration loading:

```bash
LOG_LEVEL=debug npm run dev
```

Output will show:
```
<<<<<<< HEAD
 Configuration loaded successfully:
=======
🔧 Configuration loaded successfully:
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab
  - Environment: development
  - Model: qwen2.5:1.5b
  - Port: 8080
  - Rate Limiting: Disabled
  - Advanced Analysis: Enabled
  - ML Detection: Enabled
  - Formal Verification: Enabled
  - Log Level: debug
```

### Environment Variable Precedence

1. **Command line environment variables** (highest priority)
2. **`.env.local`** file
3. **`.env.{NODE_ENV}`** file (e.g., `.env.production`)
4. **`.env`** file
5. **Default values** (lowest priority)

### Configuration Helpers

```javascript
// Check if a feature is enabled
import { isFeatureEnabled } from './src/mastra/config/settings';

if (isFeatureEnabled('enableMLDetection')) {
  // ML detection is enabled
}

// Get timeout values
import { getTimeout } from './src/mastra/config/settings';

const analysisTimeout = getTimeout('analysis');

// Get security settings
import { getSecuritySetting } from './src/mastra/config/settings';

const maxSize = getSecuritySetting('maxContractSize');
```

<<<<<<< HEAD
##  Quick Configuration Examples
=======
## 🚀 Quick Configuration Examples
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

### Minimal Configuration

```bash
# Minimal .env for quick start
MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
API_BASE_URL=http://127.0.0.1:11500/api
```

### High-Performance Configuration

```bash
# High-performance .env
MODEL_NAME_AT_ENDPOINT=qwen2.5:7b
MAX_CONCURRENT_ANALYSIS=8
ENABLE_CACHING=true
CACHE_TIMEOUT=1800000
REQUEST_TIMEOUT=120000
ANALYSIS_TIMEOUT=600000
```

### Security-Focused Configuration

```bash
# Security-focused .env
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_MINUTE=20
MAX_CONTRACT_SIZE=25000
ENABLE_INPUT_SANITIZATION=true
LOG_LEVEL=warn
ENABLE_FILE_LOGGING=true
```

### Testing Configuration

```bash
# Testing .env
NODE_ENV=test
MAX_ANALYSIS_DEPTH=basic
ENABLE_ADVANCED_ANALYSIS=false
REQUEST_TIMEOUT=10000
LOG_LEVEL=error
```

For more configuration options and examples, see the `.env.example` file in the project root.