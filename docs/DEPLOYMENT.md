# Deployment Guide

## 🚀 Smart Contract Auditor Agent Deployment

This guide covers deploying the Smart Contract Auditor Agent to various environments, with a focus on Nosana deployment for the hackathon.

## 📋 Pre-deployment Checklist

### Security Verification

- [ ] No sensitive data in source code
- [ ] Environment variables properly configured
- [ ] Input validation implemented
- [ ] Rate limiting enabled for production
- [ ] Security headers configured
- [ ] Logs don't expose sensitive information

### Testing Verification

- [ ] All security tests pass
- [ ] Agent responds correctly to test contracts
- [ ] Vulnerability detection works
- [ ] Gas optimization provides recommendations
- [ ] Audit reports generate properly
- [ ] Error handling works correctly

### Performance Verification

- [ ] Docker image size optimized
- [ ] Memory usage within limits
- [ ] Response times acceptable
- [ ] Resource cleanup working

## 🐳 Docker Deployment

### 1. Build Optimized Image

```bash
# Build with build args for optimization
docker build \
  --build-arg NODE_ENV=production \
  --tag yourusername/smart-contract-auditor:latest \
  --tag yourusername/smart-contract-auditor:v1.0.0 \
  .

# Verify image size
docker images yourusername/smart-contract-auditor:latest
```

### 2. Test Locally

```bash
# Run with production settings
docker run -d \
  --name auditor-test \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e ENABLE_RATE_LIMITING=true \
  yourusername/smart-contract-auditor:latest

# Test health check
curl http://localhost:8080/health

# Test agent endpoint
curl -X POST http://localhost:8080/agents/smartContractAuditorAgent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, can you help me audit a smart contract?"}'

# Clean up
docker stop auditor-test && docker rm auditor-test
```

### 3. Push to Registry

```bash
# Login to Docker Hub
docker login

# Push both tags
docker push yourusername/smart-contract-auditor:latest
docker push yourusername/smart-contract-auditor:v1.0.0
```

## 🌐 Nosana Deployment

### 1. Update Job Definition

Edit `nos_job_def/nosana_mastra.json`:

```json
{
  "ops": [
    {
      "id": "smart-contract-auditor",
      "args": {
        "gpu": true,
        "image": "docker.io/yourusername/smart-contract-auditor:latest",
        "expose": [
          {
            "port": 8080,
            "health_checks": [
              {
                "path": "/health",
                "type": "http",
                "method": "GET",
                "expected_status": 200,
                "continuous": true
              }
            ]
          }
        ],
        "env": {
          "NODE_ENV": "production",
          "ENABLE_RATE_LIMITING": "true",
          "MAX_REQUESTS_PER_MINUTE": "60",
          "LOG_LEVEL": "warn"
        },
        "entrypoint": ["/bin/sh"]
      },
      "type": "container/run"
    }
  ],
  "meta": {
    "trigger": "dashboard",
    "system_requirements": {
      "required_vram": 4,
      "required_ram": 8
    }
  },
  "type": "container",
  "version": "0.1"
}
```

### 2. Deploy with Nosana CLI

```bash
# Install Nosana CLI (if not already installed)
npm install -g @nosana/cli

# Check wallet balance
nosana address
nosana balance

# Deploy to Nosana
nosana job post \
  --file ./nos_job_def/nosana_mastra.json \
  --market nvidia-3060 \
  --timeout 30

# Monitor deployment
nosana job list
```

### 3. Verify Deployment

```bash
# Get job details
nosana job get <JOB_ID>

# Check logs
nosana job logs <JOB_ID>

# Test deployed endpoint
curl https://<NOSANA_ENDPOINT>/health
```

## 🔧 Environment Configuration

### Production Environment Variables

```bash
# Core configuration
NODE_ENV=production
PORT=8080

# LLM configuration
MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
API_BASE_URL=http://127.0.0.1:11500/api

# Security configuration
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_MINUTE=60
LOG_LEVEL=warn

# Performance configuration
TIMEOUT_MS=30000
MAX_MEMORY_MB=4096
```

### Development vs Production

| Setting       | Development | Production |
| ------------- | ----------- | ---------- |
| LOG_LEVEL     | debug       | warn       |
| RATE_LIMITING | false       | true       |
| NODE_ENV      | development | production |
| TIMEOUT       | 10s         | 30s        |

## 📊 Monitoring & Health Checks

### Health Check Endpoint

```bash
# Basic health check
GET /health

# Response
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "version": "1.0.0",
  "environment": "production"
}
```

### Monitoring Metrics

- Response time
- Memory usage
- Request rate
- Error rate
- Model availability

### Logging

```bash
# View logs in production
docker logs <container_id>

# Follow logs
docker logs -f <container_id>

# Filter by level
docker logs <container_id> 2>&1 | grep "ERROR"
```

## 🚨 Troubleshooting

### Common Issues

**1. Ollama Connection Failed**

```bash
# Check Ollama status
curl http://localhost:11500/api/tags

# Restart container
docker restart <container_id>
```

**2. High Memory Usage**

```bash
# Check memory usage
docker stats <container_id>

# Reduce model size
# Use qwen2.5:1.5b instead of qwen2.5:32b
```

**3. Rate Limiting Issues**

```bash
# Check rate limit settings
curl -I http://localhost:8080/health

# Adjust in environment
ENABLE_RATE_LIMITING=false  # For testing only
```

**4. Container Won't Start**

```bash
# Check logs
docker logs <container_id>

# Common fixes:
# - Increase memory allocation
# - Check port availability
# - Verify image integrity
```

### Performance Optimization

**Memory Optimization**

```dockerfile
# In Dockerfile
ENV NODE_OPTIONS="--max-old-space-size=4096"
```

**Response Time Optimization**

```bash
# Use smaller model for faster responses
MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b

# Increase timeout for complex analysis
TIMEOUT_MS=60000
```

## 📈 Scaling Considerations

### Horizontal Scaling

- Deploy multiple instances
- Use load balancer
- Implement session affinity

### Vertical Scaling

- Increase memory allocation
- Use larger GPU instances
- Optimize model size

### Resource Requirements

| Model        | RAM  | VRAM | CPU     |
| ------------ | ---- | ---- | ------- |
| qwen2.5:1.5b | 4GB  | 2GB  | 2 cores |
| qwen2.5:32b  | 16GB | 8GB  | 4 cores |

## 🔐 Security in Production

### Security Checklist

- [ ] HTTPS enabled
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] Logs sanitized
- [ ] Container running as non-root
- [ ] Security headers set
- [ ] No debug information exposed

### Security Monitoring

```bash
# Monitor for suspicious activity
grep "Rate limit exceeded" /var/log/app.log

# Check for injection attempts
grep "script\|SELECT\|DROP" /var/log/app.log

# Monitor resource usage
docker stats --no-stream
```

## 📝 Deployment Verification

### Post-Deployment Tests

```bash
# 1. Health check
curl https://your-deployment/health

# 2. Basic functionality
curl -X POST https://your-deployment/agents/smartContractAuditorAgent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'

# 3. Rate limiting
for i in {1..70}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://your-deployment/health
done

# 4. Security headers
curl -I https://your-deployment/health
```

### Success Criteria

- [ ] Health check returns 200
- [ ] Agent responds to messages
- [ ] Rate limiting works (429 after limit)
- [ ] Security headers present
- [ ] No sensitive data in responses
- [ ] Performance within acceptable limits

---

**Deployment completed successfully!** 🎉

Remember to:

1. Monitor the deployment for the first 24 hours
2. Check logs for any errors
3. Verify all security measures are active
4. Document the deployment URL for submission
