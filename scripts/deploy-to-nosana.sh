#!/bin/bash
# Comprehensive Nosana deployment script with testing and verification

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_IMAGE="yusasive/smart-contract-auditor"
DOCKER_TAG="latest"
NOSANA_JOB_FILE="./nos_job_def/nosana_mastra.json"
DEPLOYMENT_LOG="deployment-$(date +%Y%m%d-%H%M%S).log"

echo -e "${BLUE}🚀 Smart Contract Auditor - Nosana Deployment Script${NC}"
echo "=================================================="

# Function to log with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOYMENT_LOG"
}

# Function to check prerequisites
check_prerequisites() {
    log "${BLUE}📋 Checking prerequisites...${NC}"
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log "${RED}❌ Docker is not running${NC}"
        exit 1
    fi
    
    # Check if Nosana CLI is installed
    if ! command -v nosana &> /dev/null; then
        log "${YELLOW}⚠️  Nosana CLI not found. Installing...${NC}"
        npm install -g @nosana/cli
    fi
    
    # Check wallet balance
    local balance=$(nosana balance 2>/dev/null || echo "0")
    log "${GREEN}💰 Wallet balance: $balance NOS${NC}"
    
    # Check if job definition exists
    if [ ! -f "$NOSANA_JOB_FILE" ]; then
        log "${RED}❌ Job definition file not found: $NOSANA_JOB_FILE${NC}"
        exit 1
    fi
    
    log "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to optimize Docker image
optimize_docker_image() {
    log "${BLUE}🔧 Optimizing Docker image...${NC}"
    
    # Build optimized image with multi-stage build
    docker build \
        --target production \
        --build-arg NODE_ENV=production \
        --build-arg ENABLE_ADVANCED_ANALYSIS=true \
        --build-arg MAX_CONCURRENT_ANALYSIS=2 \
        -t "$DOCKER_IMAGE:$DOCKER_TAG" \
        -t "$DOCKER_IMAGE:optimized" \
        . 2>&1 | tee -a "$DEPLOYMENT_LOG"
    
    # Check image size
    local image_size=$(docker images "$DOCKER_IMAGE:$DOCKER_TAG" --format "table {{.Size}}" | tail -n 1)
    log "${GREEN}📦 Image size: $image_size${NC}"
    
    # Test image locally
    log "${BLUE}🧪 Testing image locally...${NC}"
    local container_id=$(docker run -d -p 8080:8080 "$DOCKER_IMAGE:$DOCKER_TAG")
    
    # Wait for container to start
    sleep 10
    
    # Test health endpoint
    if curl -f http://localhost:8080/health &> /dev/null; then
        log "${GREEN}✅ Local image test passed${NC}"
    else
        log "${RED}❌ Local image test failed${NC}"
        docker logs "$container_id" | tail -20 | tee -a "$DEPLOYMENT_LOG"
        docker stop "$container_id" &> /dev/null
        exit 1
    fi
    
    docker stop "$container_id" &> /dev/null
}

# Function to push to registry
push_to_registry() {
    log "${BLUE}📤 Pushing to Docker registry...${NC}"
    
    # Login to Docker Hub (assumes credentials are configured)
    docker push "$DOCKER_IMAGE:$DOCKER_TAG" 2>&1 | tee -a "$DEPLOYMENT_LOG"
    docker push "$DOCKER_IMAGE:optimized" 2>&1 | tee -a "$DEPLOYMENT_LOG"
    
    log "${GREEN}✅ Image pushed successfully${NC}"
}

# Function to deploy to Nosana
deploy_to_nosana() {
    log "${BLUE}🚀 Deploying to Nosana...${NC}"
    
    # Deploy with error handling
    local job_output
    if job_output=$(nosana job post --file "$NOSANA_JOB_FILE" --market nvidia-3060 --timeout 30 2>&1); then
        local job_id=$(echo "$job_output" | grep -o 'Job ID: [A-Za-z0-9]*' | cut -d' ' -f3)
        
        if [ -n "$job_id" ]; then
            log "${GREEN}✅ Deployment successful! Job ID: $job_id${NC}"
            echo "$job_id" > .nosana-job-id
            
            # Monitor deployment
            monitor_deployment "$job_id"
        else
            log "${RED}❌ Could not extract Job ID from output${NC}"
            echo "$job_output" | tee -a "$DEPLOYMENT_LOG"
            exit 1
        fi
    else
        log "${RED}❌ Deployment failed${NC}"
        echo "$job_output" | tee -a "$DEPLOYMENT_LOG"
        exit 1
    fi
}

# Function to monitor deployment
monitor_deployment() {
    local job_id=$1
    log "${BLUE}👀 Monitoring deployment: $job_id${NC}"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local status=$(nosana job get "$job_id" 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unknown")
        
        case $status in
            "running")
                log "${YELLOW}⏳ Job is running... (attempt $attempt/$max_attempts)${NC}"
                ;;
            "completed")
                log "${GREEN}✅ Job completed successfully!${NC}"
                get_deployment_url "$job_id"
                return 0
                ;;
            "failed")
                log "${RED}❌ Job failed${NC}"
                nosana job logs "$job_id" | tail -20 | tee -a "$DEPLOYMENT_LOG"
                return 1
                ;;
            *)
                log "${YELLOW}⏳ Job status: $status (attempt $attempt/$max_attempts)${NC}"
                ;;
        esac
        
        sleep 10
        ((attempt++))
    done
    
    log "${RED}❌ Deployment monitoring timeout${NC}"
    return 1
}

# Function to get deployment URL
get_deployment_url() {
    local job_id=$1
    log "${BLUE}🔗 Getting deployment URL...${NC}"
    
    local job_info=$(nosana job get "$job_id" 2>/dev/null)
    local url=$(echo "$job_info" | jq -r '.result.url' 2>/dev/null || echo "")
    
    if [ -n "$url" ] && [ "$url" != "null" ]; then
        log "${GREEN}🌐 Deployment URL: $url${NC}"
        echo "$url" > .nosana-deployment-url
        
        # Test the deployed endpoint
        test_deployed_endpoint "$url"
    else
        log "${YELLOW}⚠️  Could not retrieve deployment URL${NC}"
    fi
}

# Function to test deployed endpoint
test_deployed_endpoint() {
    local url=$1
    log "${BLUE}🧪 Testing deployed endpoint...${NC}"
    
    # Wait for service to be ready
    sleep 30
    
    # Test health endpoint
    if curl -f "$url/health" &> /dev/null; then
        log "${GREEN}✅ Health check passed${NC}"
        
        # Test agent endpoint
        local test_response=$(curl -s -X POST "$url/agents/smartContractAuditorAgent/chat" \
            -H "Content-Type: application/json" \
            -d '{"message": "Hello, can you help me audit a smart contract?"}' \
            --max-time 30 2>/dev/null || echo "")
        
        if [ -n "$test_response" ]; then
            log "${GREEN}✅ Agent endpoint test passed${NC}"
            log "${GREEN}🎉 Deployment verification complete!${NC}"
        else
            log "${YELLOW}⚠️  Agent endpoint test failed (may need more time to initialize)${NC}"
        fi
    else
        log "${RED}❌ Health check failed${NC}"
    fi
}

# Function to cleanup on failure
cleanup() {
    log "${YELLOW}🧹 Cleaning up...${NC}"
    
    # Stop any running containers
    docker ps -q --filter ancestor="$DOCKER_IMAGE:$DOCKER_TAG" | xargs -r docker stop
    
    # Remove temporary files
    rm -f .nosana-job-id .nosana-deployment-url
}

# Function to show deployment summary
show_summary() {
    log "${BLUE}📊 Deployment Summary${NC}"
    echo "===================="
    
    if [ -f .nosana-job-id ]; then
        local job_id=$(cat .nosana-job-id)
        log "${GREEN}Job ID: $job_id${NC}"
    fi
    
    if [ -f .nosana-deployment-url ]; then
        local url=$(cat .nosana-deployment-url)
        log "${GREEN}Deployment URL: $url${NC}"
    fi
    
    log "${GREEN}Deployment log: $DEPLOYMENT_LOG${NC}"
    log "${GREEN}Docker image: $DOCKER_IMAGE:$DOCKER_TAG${NC}"
}

# Main execution
main() {
    # Set trap for cleanup on exit
    trap cleanup EXIT
    
    log "${BLUE}🚀 Starting Nosana deployment process...${NC}"
    
    check_prerequisites
    optimize_docker_image
    push_to_registry
    deploy_to_nosana
    show_summary
    
    log "${GREEN}🎉 Deployment process completed successfully!${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --image)
            DOCKER_IMAGE="$2"
            shift 2
            ;;
        --tag)
            DOCKER_TAG="$2"
            shift 2
            ;;
        --job-file)
            NOSANA_JOB_FILE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --image IMAGE    Docker image name (default: yusasive/smart-contract-auditor)"
            echo "  --tag TAG        Docker tag (default: latest)"
            echo "  --job-file FILE  Nosana job definition file (default: ./nos_job_def/nosana_mastra.json)"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            log "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Run main function
main