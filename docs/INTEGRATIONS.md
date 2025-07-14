# Developer Integrations Guide

The Smart Contract Auditor Agent provides seamless integrations with popular development tools to enhance your workflow.

<<<<<<< HEAD
##  Available Integrations
=======
## 🔌 Available Integrations
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

### 1. VS Code Extension

**Installation:**
```bash
# Install from VS Code Marketplace (when published)
# Or install locally for development
cd integrations/vscode-extension
npm install
npm run compile
```

**Features:**
- Right-click analysis on `.sol` files
- Real-time security feedback as you type
- Inline diagnostics and warnings
- Comprehensive audit report generation
- Configurable analysis depth

**Usage:**
1. Open any Solidity file in VS Code
2. Right-click → "Analyze Contract"
3. View results in the analysis panel
4. Generate reports with Cmd/Ctrl+Shift+P → "Generate Audit Report"

**Configuration:**
```json
{
  "smartContractAuditor.apiUrl": "http://localhost:8080",
  "smartContractAuditor.enableRealTimeAnalysis": true,
  "smartContractAuditor.analysisDepth": "intermediate"
}
```

### 2. Hardhat Plugin

**Installation:**
```bash
npm install hardhat-smart-contract-auditor
```

**Setup in `hardhat.config.js`:**
```javascript
require("hardhat-smart-contract-auditor");

module.exports = {
  smartContractAuditor: {
    apiUrl: "http://localhost:8080",
    analysisDepth: "intermediate",
    generateReports: true,
    outputDir: "./audit-reports"
  }
};
```

**Usage:**
```bash
# Analyze all contracts
npx hardhat audit

# Analyze specific contract
npx hardhat audit --contract contracts/MyToken.sol

# Generate comprehensive reports
npx hardhat audit:report

# Deep analysis
npx hardhat audit --depth deep --report
```

### 3. CLI Tool

**Installation:**
```bash
npm install -g smart-contract-auditor-cli
```

**Usage:**
```bash
# Analyze single contract
sca analyze contracts/MyToken.sol

# Batch analyze directory
sca batch contracts/ --depth deep

# Generate comprehensive report
sca report contracts/MyToken.sol

# Interactive mode
sca interactive

# Configure settings
sca config

# Health check
sca health
```

**Configuration:**
```bash
# Create .sca-config.json
{
  "apiUrl": "http://localhost:8080",
  "analysisDepth": "intermediate",
  "outputDir": "./audit-reports",
  "autoSave": true
}
```

<<<<<<< HEAD
##  Multi-Chain Analysis
=======
## 🌐 Multi-Chain Analysis
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

### Supported Chains

- **Ethereum** (Mainnet)
- **Binance Smart Chain** (BSC)
- **Polygon** (MATIC)
- **Arbitrum One**
- **Optimism**

### Chain-Specific Features

**Ethereum:**
- MEV vulnerability detection
- High gas cost warnings
- Front-running protection analysis

**BSC:**
- Centralization risk assessment
- Validator attack vectors
- BEP-20 compatibility checks

**Polygon:**
- Checkpoint dependency analysis
- Plasma exit vulnerabilities
- MATIC-specific optimizations

**Arbitrum:**
- L1-L2 messaging security
- Sequencer downtime handling
- Block number inconsistencies

**Optimism:**
- Fraud proof mechanisms
- Withdrawal delay considerations
- OVM compatibility issues

### Usage Example

```javascript
// Multi-chain analysis
const result = await multiChainAnalyzer.execute({
  contractCode: contractCode,
  targetChains: ['ethereum', 'polygon', 'arbitrum'],
  includeGasAnalysis: true,
  checkCrossChainCompatibility: true
});

console.log('Supported chains:', result.supportedChains);
console.log('Chain-specific issues:', result.chainSpecificIssues);
console.log('Cross-chain compatible:', result.crossChainCompatibility.compatible);
```

<<<<<<< HEAD
##  Accessibility Features
=======
## 👥 Accessibility Features
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

### Simplified Reports

The accessibility enhancer makes technical audit results understandable for:
- **Business stakeholders**
- **Project managers**
- **Non-technical team members**

### Features

**Visual Summary:**
- Security grade (A+ to F)
- Risk meter (0-100)
- Category breakdown with status indicators

**Business Impact:**
- Deployment readiness assessment
- Risk to users and business
- Estimated cost to fix issues
- Recommended actions

**Developer-Friendly:**
- Security checklist with pass/fail status
- Code quality score
- Best practices compliance

### Usage Example

```javascript
const accessibleReport = await accessibilityEnhancer.execute({
  auditResults: analysisResults,
  targetAudience: 'business',
  includeVisuals: true,
  simplificationLevel: 'basic'
});

console.log('Overall risk:', accessibleReport.simplifiedSummary.overallRisk);
console.log('Action required:', accessibleReport.simplifiedSummary.actionRequired);
console.log('Security grade:', accessibleReport.visualSummary.securityGrade);
```

<<<<<<< HEAD
##  Custom Integrations
=======
## 🔧 Custom Integrations
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

### REST API Integration

```javascript
// Basic analysis
const response = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: `Analyze this contract: ${contractCode}`
  })
});

// Multi-chain analysis
const multiChainResponse = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: `Perform multi-chain analysis for Ethereum and Polygon: ${contractCode}`
  })
});
```

### Webhook Integration

```javascript
// Set up webhook for continuous monitoring
app.post('/webhook/contract-deployed', async (req, res) => {
  const { contractAddress, chainId, contractCode } = req.body;
  
  // Trigger analysis
  const analysis = await analyzeContract(contractCode);
  
  // Send alerts if critical issues found
  if (analysis.criticalIssues > 0) {
    await sendAlert({
      contract: contractAddress,
      chain: chainId,
      issues: analysis.criticalIssues
    });
  }
  
  res.json({ status: 'analyzed' });
});
```

<<<<<<< HEAD
##  CI/CD Integration
=======
## 📊 CI/CD Integration
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

### GitHub Actions

```yaml
name: Smart Contract Security Audit

on:
  pull_request:
    paths:
      - 'contracts/**/*.sol'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Start Auditor Agent
        run: |
          docker run -d -p 8080:8080 smart-contract-auditor:latest
          sleep 30
          
      - name: Run Security Audit
        run: |
          npx smart-contract-auditor-cli batch contracts/ --depth intermediate --report
          
      - name: Upload Audit Reports
        uses: actions/upload-artifact@v3
        with:
          name: audit-reports
          path: audit-reports/
```

### GitLab CI

```yaml
audit:
  stage: test
  image: node:18
  services:
    - name: smart-contract-auditor:latest
      alias: auditor
  script:
    - npm install -g smart-contract-auditor-cli
    - sca config --api-url http://auditor:8080
    - sca batch contracts/ --depth deep --report
  artifacts:
    paths:
      - audit-reports/
    expire_in: 1 week
```

<<<<<<< HEAD
##  Best Practices
=======
## 🎯 Best Practices
>>>>>>> 9fe0422b6fd227d2cb8aa8feee97ce4b030971ab

### Development Workflow

1. **Pre-commit Analysis**: Use VS Code extension for real-time feedback
2. **Pre-deployment Audit**: Run comprehensive analysis with CLI or Hardhat
3. **Multi-chain Verification**: Test compatibility across target chains
4. **Accessibility Review**: Generate simplified reports for stakeholders
5. **Continuous Monitoring**: Set up webhooks for deployed contracts

### Performance Optimization

- Use `basic` depth for quick feedback during development
- Use `intermediate` depth for regular audits
- Use `deep` depth for pre-deployment comprehensive analysis
- Enable caching for repeated analysis of similar contracts

### Security Considerations

- Run auditor agent in isolated environment
- Use HTTPS for production API endpoints
- Implement proper authentication for sensitive contracts
- Regular updates to vulnerability patterns and ML models

---

For more detailed examples and advanced configurations, see the individual integration documentation in the `integrations/` directory.