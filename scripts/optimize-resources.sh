#!/bin/bash
# Resource optimization script for Nosana deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Optimize Docker image
optimize_docker() {
    log "${BLUE}🔧 Optimizing Docker image for resource efficiency...${NC}"
    
    # Create optimized Dockerfile
    cat > Dockerfile.optimized << 'EOF'
# Multi-stage optimized build for Nosana deployment
FROM ollama/ollama:0.7.0 AS base

# Install minimal dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm \
    && apt-get clean

# Production stage
FROM base AS production

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY . .

# Build application
RUN pnpm run build

# Remove development files and cache
RUN rm -rf src/ \
    && rm -rf node_modules/.cache \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/* \
    && pnpm store prune

# Optimize for smaller model and faster startup
ENV NODE_ENV=production
ENV MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
ENV API_BASE_URL=http://127.0.0.1:11500/api
ENV PORT=8080
ENV MAX_CONCURRENT_ANALYSIS=2
ENV ENABLE_CACHING=true
ENV REQUEST_TIMEOUT=45000
ENV ANALYSIS_TIMEOUT=90000

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /app

# Health check with shorter interval
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

# Optimized startup with resource limits
CMD ["sh", "-c", "set -e && \
    echo 'Starting optimized Ollama service...' && \
    ollama serve & \
    OLLAMA_PID=$! && \
    timeout=45 && \
    while [ $timeout -gt 0 ] && ! curl -s http://127.0.0.1:11500/api/tags >/dev/null 2>&1; do \
        sleep 2 && timeout=$((timeout-2)); \
    done && \
    if [ $timeout -le 0 ]; then \
        echo 'Ollama startup timeout' && exit 1; \
    fi && \
    echo 'Pulling optimized model...' && \
    ollama pull ${MODEL_NAME_AT_ENDPOINT} && \
    echo 'Starting application...' && \
    exec node .mastra/output/index.mjs"]
EOF

    # Build optimized image
    docker build -f Dockerfile.optimized -t smart-contract-auditor:optimized .
    
    # Compare image sizes
    local original_size=$(docker images smart-contract-auditor:latest --format "{{.Size}}" 2>/dev/null || echo "N/A")
    local optimized_size=$(docker images smart-contract-auditor:optimized --format "{{.Size}}")
    
    log "${GREEN}📦 Original image size: $original_size${NC}"
    log "${GREEN}📦 Optimized image size: $optimized_size${NC}"
}

# Create resource-optimized job definitions
create_optimized_jobs() {
    log "${BLUE}⚙️ Creating resource-optimized job definitions...${NC}"
    
    # CPU-optimized version (no GPU)
    cat > nos_job_def/nosana_cpu_optimized.json << 'EOF'
{
  "ops": [
    {
      "id": "smart-contract-auditor-cpu",
      "args": {
        "gpu": false,
        "image": "docker.io/yusasive/smart-contract-auditor:optimized",
        "expose": [
          {
            "port": 8080,
            "health_checks": [
              {
                "path": "/health",
                "type": "http",
                "method": "GET",
                "expected_status": 200,
                "continuous": true,
                "interval": 30
              }
            ]
          }
        ],
        "env": {
          "NODE_ENV": "production",
          "MODEL_NAME_AT_ENDPOINT": "qwen2.5:1.5b",
          "ENABLE_RATE_LIMITING": "true",
          "MAX_REQUESTS_PER_MINUTE": "30",
          "MAX_CONCURRENT_ANALYSIS": "2",
          "ENABLE_CACHING": "true",
          "REQUEST_TIMEOUT": "45000",
          "ANALYSIS_TIMEOUT": "90000",
          "LOG_LEVEL": "warn"
        },
        "resources": {
          "memory": "4Gi",
          "cpu": "2"
        },
        "entrypoint": ["/bin/sh"]
      },
      "type": "container/run"
    }
  ],
  "meta": {
    "trigger": "dashboard",
    "system_requirements": {
      "required_ram": 4,
      "required_cpu": 2
    }
  },
  "type": "container",
  "version": "0.1"
}
EOF

    # GPU-optimized version (minimal GPU requirements)
    cat > nos_job_def/nosana_gpu_optimized.json << 'EOF'
{
  "ops": [
    {
      "id": "smart-contract-auditor-gpu",
      "args": {
        "gpu": true,
        "image": "docker.io/yusasive/smart-contract-auditor:optimized",
        "expose": [
          {
            "port": 8080,
            "health_checks": [
              {
                "path": "/health",
                "type": "http",
                "method": "GET",
                "expected_status": 200,
                "continuous": true,
                "interval": 30
              }
            ]
          }
        ],
        "env": {
          "NODE_ENV": "production",
          "MODEL_NAME_AT_ENDPOINT": "qwen2.5:1.5b",
          "ENABLE_RATE_LIMITING": "true",
          "MAX_REQUESTS_PER_MINUTE": "60",
          "MAX_CONCURRENT_ANALYSIS": "3",
          "ENABLE_CACHING": "true",
          "REQUEST_TIMEOUT": "30000",
          "ANALYSIS_TIMEOUT": "60000",
          "LOG_LEVEL": "warn"
        },
        "resources": {
          "memory": "6Gi",
          "cpu": "2"
        },
        "entrypoint": ["/bin/sh"]
      },
      "type": "container/run"
    }
  ],
  "meta": {
    "trigger": "dashboard",
    "system_requirements": {
      "required_vram": 3,
      "required_ram": 6,
      "required_cpu": 2
    }
  },
  "type": "container",
  "version": "0.1"
}
EOF

    log "${GREEN}✅ Created optimized job definitions${NC}"
}

# Create cost monitoring script
create_cost_monitor() {
    log "${BLUE}💰 Creating cost monitoring script...${NC}"
    
    cat > scripts/monitor-costs.sh << 'EOF'
#!/bin/bash
# Cost monitoring script for Nosana deployment

JOB_ID=${1:-$(cat .nosana-job-id 2>/dev/null)}

if [ -z "$JOB_ID" ]; then
    echo "Usage: $0 <job-id>"
    echo "Or run from directory with .nosana-job-id file"
    exit 1
fi

echo "💰 Monitoring costs for job: $JOB_ID"
echo "=================================="

# Get job information
JOB_INFO=$(nosana job get "$JOB_ID" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "📊 Job Status: $(echo "$JOB_INFO" | jq -r '.status')"
    echo "⏱️  Runtime: $(echo "$JOB_INFO" | jq -r '.runtime // "N/A"')"
    echo "💾 Resources: $(echo "$JOB_INFO" | jq -r '.resources // "N/A"')"
    echo "💸 Cost: $(echo "$JOB_INFO" | jq -r '.cost // "N/A"') NOS"
else
    echo "❌ Could not retrieve job information"
fi

# Monitor resource usage over time
echo ""
echo "📈 Resource Usage Monitoring:"
echo "============================="

for i in {1..5}; do
    echo "Sample $i/5:"
    nosana job get "$JOB_ID" 2>/dev/null | jq -r '.metrics // "No metrics available"'
    sleep 10
done
EOF

    chmod +x scripts/monitor-costs.sh
    log "${GREEN}✅ Created cost monitoring script${NC}"
}

# Create deployment options guide
create_deployment_guide() {
    log "${BLUE}📚 Creating deployment options guide...${NC}"
    
    cat > docs/DEPLOYMENT_OPTIONS.md << 'EOF'
# Deployment Options Guide

## Resource-Optimized Deployments

### 1. CPU-Only Deployment (Most Cost-Effective)
```bash
# Deploy without GPU requirements
nosana job post --file ./nos_job_def/nosana_cpu_optimized.json --market cpu-optimized --timeout 30
```

**Pros:**
- Lower cost (no GPU required)
- Wider availability of nodes
- Suitable for basic analysis

**Cons:**
- Slower model inference
- Limited concurrent analysis

### 2. GPU-Optimized Deployment (Balanced)
```bash
# Deploy with minimal GPU requirements
nosana job post --file ./nos_job_def/nosana_gpu_optimized.json --market nvidia-3060 --timeout 30
```

**Pros:**
- Faster inference
- Better performance
- Moderate cost

**Cons:**
- Higher cost than CPU-only
- GPU availability dependent

### 3. High-Performance Deployment (Premium)
```bash
# Deploy with full GPU resources
nosana job post --file ./nos_job_def/nosana_mastra.json --market nvidia-3090 --timeout 30
```

**Pros:**
- Fastest performance
- Maximum concurrent analysis
- Best user experience

**Cons:**
- Highest cost
- Limited node availability

## Cost Optimization Strategies

### 1. Model Selection
- **qwen2.5:1.5b**: Fastest, lowest resource usage
- **qwen2.5:7b**: Better accuracy, moderate resources
- **qwen2.5:32b**: Best accuracy, highest resources

### 2. Resource Limits
```json
{
  "resources": {
    "memory": "4Gi",    // Minimum for 1.5b model
    "cpu": "2",         // 2 cores sufficient
    "gpu_memory": "3Gi" // Minimal GPU memory
  }
}
```

### 3. Caching Strategy
```bash
# Enable aggressive caching
ENABLE_CACHING=true
CACHE_TIMEOUT=1800000  # 30 minutes
```

### 4. Request Optimization
```bash
# Optimize for cost
MAX_CONCURRENT_ANALYSIS=2
REQUEST_TIMEOUT=45000
ANALYSIS_TIMEOUT=90000
```

## Monitoring and Alerts

### Cost Monitoring
```bash
# Monitor deployment costs
./scripts/monitor-costs.sh <job-id>
```

### Performance Monitoring
```bash
# Check deployment performance
./scripts/verify-deployment.sh --url <deployment-url>
```

## Deployment Decision Matrix

| Use Case | Deployment Type | Expected Cost | Performance |
|----------|----------------|---------------|-------------|
| Demo/Testing | CPU-Optimized | Low | Basic |
| Development | GPU-Optimized | Medium | Good |
| Production | High-Performance | High | Excellent |
| Hackathon | GPU-Optimized | Medium | Good |

## Best Practices

1. **Start with CPU-optimized** for initial testing
2. **Scale up** based on performance requirements
3. **Monitor costs** regularly during deployment
4. **Use caching** to reduce redundant analysis
5. **Set appropriate timeouts** to prevent runaway costs
6. **Clean up** unused deployments promptly

EOF

    log "${GREEN}✅ Created deployment options guide${NC}"
}

# Main optimization process
main() {
    log "${BLUE}🚀 Starting resource optimization...${NC}"
    
    optimize_docker
    create_optimized_jobs
    create_cost_monitor
    create_deployment_guide
    
    log "${GREEN}🎉 Resource optimization completed!${NC}"
    log "${YELLOW}📋 Next steps:${NC}"
    log "  1. Test optimized image: docker run -p 8080:8080 smart-contract-auditor:optimized"
    log "  2. Deploy with: ./scripts/deploy-to-nosana.sh"
    log "  3. Monitor costs: ./scripts/monitor-costs.sh"
    log "  4. Verify deployment: ./scripts/verify-deployment.sh"
}

main