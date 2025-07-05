FROM ollama/ollama:0.7.0

# Qwen2.5:1.5b - Docker
ENV API_BASE_URL=http://127.0.0.1:11434/api
ENV MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b

# Qwen2.5:32b = Docker
# ENV API_BASE_URL=http://127.0.0.1:11434/api
# ENV MODEL_NAME_AT_ENDPOINT=qwen2.5:32b

# Install system dependencies and Node.js
RUN apt-get update && apt-get install -y \
  curl \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm

# Create app directory
WORKDIR /app

# Copy package files
COPY .env.docker package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy the rest of the application
COPY . .

# Build the project
RUN pnpm run build

# Override the default entrypoint
ENTRYPOINT ["/bin/sh", "-c"]

# Start Ollama service with proper health check and wait for it to be ready
CMD ["ollama serve & \
  echo 'Waiting for Ollama to be ready...' && \
  while ! curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1; do \
    echo 'Ollama not ready yet, waiting 2 seconds...' && \
    sleep 2; \
  done && \
  echo 'Ollama is ready! Pulling model...' && \
  ollama pull ${MODEL_NAME_AT_ENDPOINT} && \
  echo 'Starting Node.js application...' && \
  node .mastra/output/index.mjs"]