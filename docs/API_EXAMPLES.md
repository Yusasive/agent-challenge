# Smart Contract Auditor Agent - API Examples

This document provides comprehensive examples of how to use the Smart Contract Auditor Agent API.

## 📚 Table of Contents

- [Basic Usage](#basic-usage)
- [Tool-Specific Examples](#tool-specific-examples)
- [Advanced Analysis](#advanced-analysis)
- [Configuration Examples](#configuration-examples)
- [Error Handling](#error-handling)
- [Integration Examples](#integration-examples)

## 🚀 Basic Usage

### Simple Contract Analysis

```javascript
// Basic contract analysis
const response = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: `Please analyze this smart contract for security issues:

pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 public storedData;
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    function set(uint256 x) public {
        require(msg.sender == owner, "Not authorized");
        storedData = x;
    }
    
    function get() public view returns (uint256) {
        return storedData;
    }
}`
  })
});

const result = await response.text();
console.log(result);
```

### Quick Vulnerability Check

```javascript
const vulnerabilityCheck = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: `Check this contract for reentrancy vulnerabilities:

contract Vulnerable {
    mapping(address => uint) balances;
    
    function withdraw() public {
        uint amount = balances[msg.sender];
        msg.sender.call{value: amount}("");
        balances[msg.sender] = 0;
    }
}`
  })
});
```

## 🔧 Tool-Specific Examples

### Contract Analyzer Tool

```javascript
// Direct tool usage (if accessing tools directly)
const analysisResult = await contractAnalyzerTool.execute({
  context: {
    contractCode: `
      pragma solidity ^0.8.0;
      contract MyContract {
        uint256 public value;
        function setValue(uint256 _value) public {
          value = _value;
        }
      }
    `,
    contractName: "MyContract"
  }
});

console.log('Security Score:', analysisResult.securityScore);
console.log('Issues Found:', analysisResult.issues.length);
console.log('Gas Optimizations:', analysisResult.gasOptimizations);
```

### Vulnerability Checker Tool

```javascript
const vulnerabilityResult = await vulnerabilityCheckerTool.execute({
  context: {
    contractCode: contractCode,
    includeReferences: true
  }
});

console.log('Total Vulnerabilities:', vulnerabilityResult.totalVulnerabilities);
console.log('Critical Issues:', vulnerabilityResult.criticalCount);
console.log('Overall Risk:', vulnerabilityResult.overallRisk);
```

### Gas Optimizer Tool

```javascript
const gasOptimization = await gasOptimizerTool.execute({
  context: {
    contractCode: contractCode,
    generateOptimizedCode: true
  }
});

console.log('Estimated Savings:', gasOptimization.estimatedGasSavings);
console.log('Optimizations:', gasOptimization.optimizations);
if (gasOptimization.optimizedCode) {
  console.log('Optimized Code:', gasOptimization.optimizedCode);
}
```

## 🧠 Advanced Analysis

### ML Anomaly Detection

```javascript
const anomalyDetection = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: `Perform ML-based anomaly detection on this DeFi contract:

pragma solidity ^0.8.0;

contract DeFiProtocol {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    
    function flashLoan(uint256 amount) external {
        uint256 balanceBefore = address(this).balance;
        
        // Complex flash loan logic
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Flash loan failed");
        
        require(address(this).balance >= balanceBefore, "Flash loan not repaid");
    }
    
    function arbitrage(address token1, address token2, uint256 amount) external {
        // Arbitrage logic with multiple external calls
        // Potentially suspicious pattern
    }
}`
  })
});
```

### Formal Verification

```javascript
const formalVerification = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: `Perform formal verification on this token contract:

pragma solidity ^0.8.0;

contract Token {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }
}

Please verify these properties:
1. Total supply conservation: sum of all balances equals totalSupply
2. Balance non-negativity: all balances >= 0
3. Transfer correctness: successful transfers maintain balance invariants`
  })
});
```

### Advanced Static Analysis

```javascript
const staticAnalysis = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: `Perform advanced static analysis including control flow and data flow analysis on this contract:

contract ComplexContract {
    uint256 private secret;
    mapping(address => bool) public authorized;
    
    function complexFunction(uint256 input) public {
        if (input > 100) {
            if (authorized[msg.sender]) {
                secret = input * 2;
                for (uint i = 0; i < input; i++) {
                    // Complex loop logic
                    if (i % 2 == 0) {
                        secret += i;
                    }
                }
            }
        }
    }
}`
  })
});
```

## ⚙️ Configuration Examples

### Custom Analysis Configuration

```javascript
// Using environment variables for configuration
const customAnalysis = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Analysis-Depth': 'deep',
    'X-Enable-ML': 'true',
    'X-Enable-Formal-Verification': 'true'
  },
  body: JSON.stringify({
    message: `Analyze this contract with deep analysis enabled: ${contractCode}`
  })
});
```

### Timeout Configuration

```javascript
// Configure custom timeouts
const analysisWithTimeout = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Analysis-Timeout': '180000', // 3 minutes
    'X-Verification-Timeout': '120000' // 2 minutes
  },
  body: JSON.stringify({
    message: `Perform comprehensive analysis: ${largeContractCode}`
  })
});
```

## 🚨 Error Handling

### Handling Analysis Timeouts

```javascript
async function analyzeWithRetry(contractCode, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Analyze this contract: ${contractCode}`
        }),
        signal: AbortSignal.timeout(60000) // 60 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Analysis failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}
```

### Handling Large Contracts

```javascript
async function analyzeLargeContract(contractCode) {
  // Check contract size
  if (contractCode.length > 50000) {
    console.warn('Large contract detected, using optimized analysis');
    
    // Split into chunks or use basic analysis
    const response = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Analysis-Depth': 'basic'
      },
      body: JSON.stringify({
        message: `Analyze this large contract with basic depth: ${contractCode}`
      })
    });
    
    return await response.text();
  }
  
  // Normal analysis for smaller contracts
  return await analyzeWithRetry(contractCode);
}
```

## 🔗 Integration Examples

### Node.js Integration

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/audit', async (req, res) => {
  try {
    const { contractCode, contractName } = req.body;
    
    if (!contractCode) {
      return res.status(400).json({ error: 'Contract code is required' });
    }
    
    const response = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Generate a comprehensive audit report for this contract named "${contractName}": ${contractCode}`
      })
    });
    
    const auditResult = await response.text();
    
    res.json({
      success: true,
      contractName,
      auditResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Audit service running on port 3000');
});
```

### React Frontend Integration

```javascript
import React, { useState } from 'react';

function ContractAuditor() {
  const [contractCode, setContractCode] = useState('');
  const [auditResult, setAuditResult] = useState('');
  const [loading, setLoading] = useState(false);

  const analyzeContract = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/agents/smartContractAuditorAgent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Analyze this smart contract: ${contractCode}`
        })
      });

      const result = await response.text();
      setAuditResult(result);
    } catch (error) {
      setAuditResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Smart Contract Auditor</h2>
      <textarea
        value={contractCode}
        onChange={(e) => setContractCode(e.target.value)}
        placeholder="Paste your Solidity contract here..."
        rows={15}
        cols={80}
      />
      <br />
      <button onClick={analyzeContract} disabled={loading || !contractCode}>
        {loading ? 'Analyzing...' : 'Analyze Contract'}
      </button>
      
      {auditResult && (
        <div>
          <h3>Audit Result:</h3>
          <pre>{auditResult}</pre>
        </div>
      )}
    </div>
  );
}

export default ContractAuditor;
```

### CLI Tool Integration

```bash
#!/bin/bash
# audit-contract.sh - CLI tool for contract auditing

CONTRACT_FILE=$1
AGENT_URL="http://localhost:8080/agents/smartContractAuditorAgent/chat"

if [ -z "$CONTRACT_FILE" ]; then
    echo "Usage: $0 <contract-file.sol>"
    exit 1
fi

if [ ! -f "$CONTRACT_FILE" ]; then
    echo "Error: File $CONTRACT_FILE not found"
    exit 1
fi

echo "🔍 Analyzing contract: $CONTRACT_FILE"

CONTRACT_CODE=$(cat "$CONTRACT_FILE")

curl -X POST "$AGENT_URL" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Generate a comprehensive security audit report for this contract: $CONTRACT_CODE\"}" \
  | jq -r '.result' > "audit-report-$(basename "$CONTRACT_FILE" .sol).md"

echo "✅ Audit complete! Report saved to audit-report-$(basename "$CONTRACT_FILE" .sol).md"
```

## 📊 Response Format Examples

### Successful Analysis Response

```json
{
  "success": true,
  "analysis": {
    "contractName": "MyContract",
    "securityScore": 85,
    "riskLevel": "Medium",
    "issues": [
      {
        "type": "Gas optimization opportunity",
        "severity": "Low",
        "description": "Function visibility can be optimized",
        "recommendation": "Change 'public' to 'external' for functions only called externally"
      }
    ],
    "gasOptimizations": [
      "Use 'external' instead of 'public' for external-only functions"
    ],
    "recommendations": [
      "Add comprehensive unit tests",
      "Consider formal verification for critical functions"
    ]
  },
  "timestamp": "2025-01-XX..."
}
```

### Error Response

```json
{
  "success": false,
  "error": "Analysis timeout",
  "message": "The contract analysis took too long to complete. Please try with a smaller contract or basic analysis depth.",
  "code": "TIMEOUT_ERROR",
  "timestamp": "2025-01-XX..."
}
```

---

## 🎯 Best Practices

1. **Always handle timeouts** - Large contracts may take time to analyze
2. **Use appropriate analysis depth** - Deep analysis for critical contracts, basic for quick checks
3. **Implement retry logic** - Network issues can cause temporary failures
4. **Validate input size** - Very large contracts may hit limits
5. **Cache results** - Avoid re-analyzing the same contract repeatedly
6. **Monitor rate limits** - Respect API rate limiting in production

For more examples and advanced usage, check the test files in the `tests/` directory.