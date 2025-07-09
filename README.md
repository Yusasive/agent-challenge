# Smart Contract Auditor Agent

![Smart Contract Auditor](./assets/NosanaBuildersChallengeAgents.jpg)

## 🔍 Overview

The **Smart Contract Auditor Agent** is an advanced AI-powered security analysis tool built for the Nosana Builders Challenge. It provides comprehensive smart contract security auditing capabilities using the Mastra framework, featuring automated vulnerability detection, gas optimization analysis, and professional audit report generation.

## 🚀 Features

### Core Capabilities

- **🛡️ Advanced Security Analysis**: Multi-layered vulnerability detection using OWASP, SWC registry patterns, and formal methods
- **🤖 ML-Based Anomaly Detection**: Machine learning algorithms to identify novel attack vectors and suspicious patterns
- **🔬 Formal Verification**: Model checking, symbolic execution, and abstract interpretation for mathematical proof of correctness
- **📊 Advanced Static Analysis**: Control flow analysis, data flow analysis, and taint analysis
- **⚡ Gas Optimization**: Automated gas usage analysis and optimization recommendations
- **📊 Professional Reports**: Generate detailed audit reports in markdown format
- **🔧 Multi-Tool Analysis**: Contract analyzer, vulnerability checker, and gas optimizer tools
- **🎯 Real-time Chat**: Interactive agent interface for contract analysis

### Security Features

- **No Sensitive Data Exposure**: All analysis is performed locally without external data transmission
- **Advanced Threat Detection**: ML-based detection of obfuscation and novel attack patterns
- **Formal Guarantees**: Mathematical verification of critical security properties
- **Input Validation**: Comprehensive input sanitization and validation
- **Rate Limiting**: Built-in protection against abuse (configurable)
- **Secure Logging**: Structured logging without sensitive information exposure

## 🏗️ Architecture

```
src/mastra/agents/smart-contract-auditor/
├── auditor-agent.ts              # Main agent definition with advanced capabilities
├── contract-analyzer-tool.ts     # Core contract analysis
├── vulnerability-checker-tool.ts # Security vulnerability detection
├── gas-optimizer-tool.ts         # Gas optimization analysis
├── audit-report-generator.ts     # Professional report generation
├── advanced-static-analyzer.ts   # Control flow, data flow, and taint analysis
├── ml-anomaly-detector.ts        # Machine learning-based anomaly detection
├── formal-verification-tool.ts   # Model checking and symbolic execution
└── index.ts                      # Module exports
```

## 📋 Requirements

### System Requirements

- **Node.js**: >= 20.9.0
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: 2GB free space for models
- **Docker**: Latest version (for containerized deployment)

### Dependencies

- `@mastra/core`: AI agent framework
- `ollama-ai-provider`: Local LLM integration
- `zod`: Runtime type validation
- `dotenv`: Environment configuration

## 🛠️ Installation & Setup

### 1. Clone and Install

```bash
git clone <your-fork-url>
cd agent-challenge
pnpm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your preferred settings
```

### 3. Local Development with Ollama

**Install Ollama:**

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

**Start Ollama and Pull Model:**

```bash
ollama serve
ollama pull qwen2.5:1.5b
```

**Start Development Server:**

```bash
pnpm run dev
```

Navigate to `http://localhost:8080/agents/smartContractAuditorAgent/chat`

## 🐳 Docker Deployment

### Build and Run Locally

```bash
# Build the container
docker build -t yourusername/smart-contract-auditor:latest .

# Run locally
docker run -p 8080:8080 yourusername/smart-contract-auditor:latest

# Test at http://localhost:8080
```

### Push to Registry

```bash
# Login to Docker Hub
docker login

# Push to registry
docker push yourusername/smart-contract-auditor:latest
```

## 🔧 Usage Examples

### Basic Contract Analysis

```
User: "Perform a comprehensive security analysis of this contract"
[Paste contract code]

Agent: Performs multi-layered analysis including:
- Security vulnerability detection
- Advanced static analysis (control flow, data flow)
- ML-based anomaly detection for novel threats
- Formal verification of critical properties
- Gas optimization opportunities
- Professional audit report generation
```

### Specific Vulnerability Check

```
User: "Check this contract for reentrancy vulnerabilities"
[Paste contract code]

Agent: Focuses on reentrancy patterns and provides detailed remediation steps
```

### Gas Optimization Analysis

```
User: "How can I optimize gas usage in this contract?"
[Paste contract code]

Agent: Provides specific gas optimization recommendations with estimated savings
```

### Advanced Analysis

```
User: "Perform formal verification on this DeFi contract"
[Paste contract code]

Agent: Conducts formal verification including:
- Model checking for safety properties
- Symbolic execution for path exploration
- Abstract interpretation for invariant analysis
- ML-based detection of novel DeFi attack patterns
- Comprehensive verification report
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Agent responds to basic contract analysis requests
- [ ] Vulnerability detection identifies common issues
- [ ] Advanced static analysis provides control flow insights
- [ ] ML anomaly detection identifies suspicious patterns
- [ ] Formal verification produces meaningful results
- [ ] Gas optimization provides actionable recommendations
- [ ] Audit reports generate properly formatted output
- [ ] Error handling works for invalid inputs
- [ ] Rate limiting functions correctly (if enabled)

### Test Contract Examples

```solidity
// Test with this vulnerable contract
pragma solidity ^0.7.0;

contract VulnerableContract {
    mapping(address => uint) public balances;

    function withdraw() public {
        uint amount = balances[msg.sender];
        (bool success,) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] = 0;
    }
}
```

## 🔒 Security Considerations

### Data Protection

- **No External Transmission**: All contract analysis is performed locally
- **Input Sanitization**: All user inputs are validated and sanitized
- **No Persistent Storage**: Contract code is not stored permanently
- **Secure Logging**: Logs exclude sensitive contract details

### Rate Limiting

```env
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_MINUTE=60
```

### Production Security

- Use environment variables for all configuration
- Enable rate limiting in production
- Monitor resource usage
- Regular security updates

## 📊 Performance Optimization

### Docker Image Optimization

- Multi-stage build process
- Minimal base image (ollama/ollama:0.7.0)
- Efficient layer caching
- Cleanup of unnecessary files

### Resource Management

- Configurable timeout settings
- Memory-efficient analysis algorithms
- Streaming responses for large reports

## 🚀 Deployment on Nosana

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
        "expose": [{ "port": 8080 }],
        "entrypoint": ["/bin/sh"]
      },
      "type": "container/run"
    }
  ],
  "meta": {
    "trigger": "dashboard",
    "system_requirements": { "required_vram": 4 }
  },
  "type": "container",
  "version": "0.1"
}
```

### 2. Deploy with Nosana CLI

```bash
# Install Nosana CLI
npm install -g @nosana/cli

# Deploy to Nosana
nosana job post --file ./nos_job_def/nosana_mastra.json --market nvidia-3060 --timeout 30
```

### 3. Monitor Deployment

Check deployment status at [Nosana Dashboard](https://dashboard.nosana.com/deploy)

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make changes following the coding standards
4. Test thoroughly
5. Submit a pull request

### Code Standards

- Use TypeScript for type safety
- Follow ESLint configuration
- Add JSDoc comments for public functions
- Maintain test coverage above 80%

## 📝 API Documentation

### Agent Endpoints

- `POST /agents/smartContractAuditorAgent/chat` - Interactive chat interface
- `GET /agents/smartContractAuditorAgent` - Agent information

### Tool Functions

- `analyze-smart-contract` - Comprehensive contract analysis
- `advanced-static-analysis` - Control flow, data flow, and taint analysis
- `ml-anomaly-detection` - Machine learning-based anomaly detection
- `formal-verification` - Model checking and symbolic execution
- `check-vulnerabilities` - Security vulnerability detection
- `optimize-gas-usage` - Gas optimization analysis
- `generate-audit-report` - Professional report generation

## 🐛 Troubleshooting

### Common Issues

**Ollama Connection Failed**

```bash
# Check if Ollama is running
curl http://localhost:11500/api/tags

# Restart Ollama service
ollama serve
```

**Model Not Found**

```bash
# Pull the required model
ollama pull qwen2.5:1.5b
```

**Docker Build Issues**

```bash
# Clean Docker cache
docker system prune -a

# Rebuild with no cache
docker build --no-cache -t yourusername/smart-contract-auditor:latest .
```

### Performance Issues

- Increase Docker memory allocation
- Use smaller model (qwen2.5:1.5b) for development
- Enable GPU acceleration if available

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Nosana](https://nosana.io) for the hackathon opportunity
- [Mastra](https://mastra.ai) for the AI agent framework
- [Ollama](https://ollama.ai) for local LLM capabilities
- OpenZeppelin for smart contract security patterns

## 📞 Support

- Join [Nosana Discord](https://nosana.com/discord)
- Follow [@nosana_ai](https://x.com/nosana_ai)
- Check [Mastra Documentation](https://mastra.ai/docs)

---

**Built for Nosana Builders Challenge 2025** 🏆