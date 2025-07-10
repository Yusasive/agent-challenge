# Multi-stage build for optimized image size
FROM ollama/ollama:0.7.0 AS base

# Install system dependencies and Node.js in a single layer
RUN apt-get update && apt-get install -y \
  curl \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm \
  && apt-get clean

# Development stage
FROM base AS development
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Production stage (optimized)
FROM base AS production

# Create app directory and set proper permissions
WORKDIR /app
RUN chown -R 1000:1000 /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY . .

# Test for mastra installment version
RUN pnpm exec mastra --version

# Build the project
RUN pnpm run build

# Remove development files and optimize for production
RUN rm -rf src/ \
  && rm -rf tests/ \
  && rm -rf docs/ \
  && rm -rf node_modules/.cache \
  && rm -rf node_modules/.pnpm \
  && rm -rf /tmp/* \
  && rm -rf /var/tmp/* \
  && pnpm store prune

# Optimized environment variables
ENV NODE_ENV=production
ENV API_BASE_URL=http://127.0.0.1:11500/api
ENV MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
ENV PORT=8080
ENV MAX_CONCURRENT_ANALYSIS=2
ENV ENABLE_CACHING=true
ENV REQUEST_TIMEOUT=45000
ENV ANALYSIS_TIMEOUT=90000
ENV ENABLE_RATE_LIMITING=true
ENV MAX_REQUESTS_PER_MINUTE=30

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser \
  && chown -R appuser:appuser /app

# Expose port
EXPOSE 8080

# Optimized health check
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Override the default entrypoint
ENTRYPOINT ["/bin/sh", "-c"]

# Optimized startup sequence with faster initialization
CMD ["set -e && \
  echo 'Starting Ollama service...' && \
  ollama serve & \
  OLLAMA_PID=$! && \
  echo 'Waiting for Ollama (optimized)...' && \
  timeout=45 && \
  while [ $timeout -gt 0 ] && ! curl -s http://127.0.0.1:11500/api/tags >/dev/null 2>&1; do \
    echo \"Ollama initializing... ($timeout seconds remaining)\" && \
    sleep 2 && \
    timeout=$((timeout-2)); \
  done && \
  if [ $timeout -le 0 ]; then \
    echo 'Ollama startup timeout' && \
    exit 1; \
  fi && \
  echo 'Pulling optimized model...' && \
  ollama pull ${MODEL_NAME_AT_ENDPOINT} && \
  echo 'Starting optimized application...' && \
  exec node .mastra/output/index.mjs"]