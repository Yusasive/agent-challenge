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

# Create app directory and set proper permissions
WORKDIR /app
RUN chown -R 1000:1000 /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Test for mastra installment version
RUN pnpm exec mastra --version

# Build the project
RUN pnpm run build

# Remove development dependencies and source files to reduce image size
RUN pnpm prune --prod \
  && rm -rf src/ \
  && rm -rf node_modules/.cache \
  && rm -rf /tmp/* \
  && rm -rf /var/tmp/*

# Set environment variables for production
ENV NODE_ENV=production
ENV API_BASE_URL=http://127.0.0.1:11500/api
ENV MODEL_NAME_AT_ENDPOINT=qwen2.5:7b
ENV PORT=8080

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser \
  && chown -R appuser:appuser /app

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Override the default entrypoint
ENTRYPOINT ["/bin/sh", "-c"]

# Optimized startup sequence with proper error handling
CMD ["set -e && \
  echo 'Starting Ollama service...' && \
  ollama serve & \
  OLLAMA_PID=$! && \
  echo 'Waiting for Ollama to be ready...' && \
  timeout=60 && \
  while [ $timeout -gt 0 ] && ! curl -s http://127.0.0.1:11500/api/tags >/dev/null 2>&1; do \
    echo \"Ollama not ready yet, waiting 2 seconds... ($timeout seconds remaining)\" && \
    sleep 2 && \
    timeout=$((timeout-2)); \
  done && \
  if [ $timeout -le 0 ]; then \
    echo 'Timeout waiting for Ollama to start' && \
    exit 1; \
  fi && \
  echo 'Ollama is ready! Pulling model...' && \
  ollama pull ${MODEL_NAME_AT_ENDPOINT} && \
  echo 'Starting Node.js application...' && \
  exec node .mastra/output/index.mjs"]