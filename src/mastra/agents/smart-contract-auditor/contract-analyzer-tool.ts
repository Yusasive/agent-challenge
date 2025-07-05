import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface SecurityIssue {
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  line?: number;
  description: string;
  recommendation: string;
  impact: string;
}

interface AnalysisResult {
  contractName: string;
  totalLines: number;
  securityScore: number;
  issues: SecurityIssue[];
  gasOptimizations: string[];
  summary: string;
}

export const contractAnalyzerTool = createTool({
  id: "analyze-smart-contract",
  description: "Performs comprehensive security analysis of Solidity smart contracts",
  inputSchema: z.object({
    contractCode: z.string().describe("The Solidity smart contract code to analyze"),
    contractName: z.string().optional().describe("Optional name of the contract"),
  }),
  outputSchema: z.object({
    contractName: z.string(),
    totalLines: z.number(),
    securityScore: z.number().min(0).max(100),
    issues: z.array(z.object({
      type: z.string(),
      severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
      line: z.number().optional(),
      description: z.string(),
      recommendation: z.string(),
      impact: z.string(),
    })),
    gasOptimizations: z.array(z.string()),
    summary: z.string(),
  }),
  execute: async ({ context }) => {
    return await analyzeContract(context.contractCode, context.contractName);
  },
});

const analyzeContract = async (contractCode: string, contractName?: string): Promise<AnalysisResult> => {
  const lines = contractCode.split('\n');
  const totalLines = lines.length;
  const issues: SecurityIssue[] = [];
  const gasOptimizations: string[] = [];

  // Extract contract name if not provided
  const nameMatch = contractCode.match(/contract\s+(\w+)/);
  const finalContractName = contractName || nameMatch?.[1] || "UnknownContract";

  // Security Analysis Patterns
  const securityChecks = [
    {
      pattern: /\.call\s*\(/g,
      type: "Low-level call",
      severity: 'High' as const,
      description: "Usage of low-level call() function detected",
      recommendation: "Use specific function calls or implement proper error handling and reentrancy protection",
      impact: "Potential for reentrancy attacks and unexpected behavior"
    },
    {
      pattern: /tx\.origin/g,
      type: "tx.origin usage",
      severity: 'Critical' as const,
      description: "Usage of tx.origin for authorization detected",
      recommendation: "Use msg.sender instead of tx.origin for access control",
      impact: "Vulnerable to phishing attacks where malicious contracts can impersonate users"
    },
    {
      pattern: /selfdestruct\s*\(/g,
      type: "Self-destruct",
      severity: 'High' as const,
      description: "Self-destruct functionality detected",
      recommendation: "Ensure proper access controls and consider the implications of contract destruction",
      impact: "Contract can be permanently destroyed, potentially locking funds"
    },
    {
      pattern: /block\.timestamp|now/g,
      type: "Timestamp dependency",
      severity: 'Medium' as const,
      description: "Dependency on block timestamp detected",
      recommendation: "Avoid using timestamps for critical logic or implement tolerance ranges",
      impact: "Miners can manipulate timestamps within reasonable bounds"
    },
    {
      pattern: /require\s*\(\s*msg\.sender\s*==\s*owner\s*\)/g,
      type: "Simple access control",
      severity: 'Medium' as const,
      description: "Basic owner-only access control detected",
      recommendation: "Consider using OpenZeppelin's Ownable or AccessControl for robust access management",
      impact: "Single point of failure and limited access control flexibility"
    },
    {
      pattern: /\.transfer\s*\(/g,
      type: "Transfer usage",
      severity: 'Medium' as const,
      description: "Usage of transfer() function detected",
      recommendation: "Consider using call() with proper checks instead of transfer() to avoid gas limit issues",
      impact: "May fail with smart contract recipients due to 2300 gas limit"
    },
    {
      pattern: /pragma\s+solidity\s+\^?[0-4]\./g,
      type: "Outdated Solidity version",
      severity: 'Medium' as const,
      description: "Outdated Solidity version detected",
      recommendation: "Update to Solidity 0.8.x or later for built-in overflow protection",
      impact: "Missing security features and potential vulnerabilities"
    },
    {
      pattern: /using\s+SafeMath/g,
      type: "SafeMath usage",
      severity: 'Low' as const,
      description: "SafeMath library usage detected",
      recommendation: "Consider upgrading to Solidity 0.8.x which has built-in overflow protection",
      impact: "Unnecessary gas overhead in newer Solidity versions"
    }
  ];

  // Check for reentrancy patterns
  const hasExternalCalls = /\.call\(|\.send\(|\.transfer\(/.test(contractCode);
  const hasStateChangesAfterCalls = checkReentrancyPattern(contractCode);
  
  if (hasExternalCalls && hasStateChangesAfterCalls) {
    issues.push({
      type: "Reentrancy vulnerability",
      severity: 'Critical',
      description: "Potential reentrancy vulnerability detected - state changes after external calls",
      recommendation: "Implement checks-effects-interactions pattern or use ReentrancyGuard",
      impact: "Attackers can drain contract funds through recursive calls"
    });
  }

  // Check for integer overflow/underflow (pre-0.8.0)
  const solidityVersion = contractCode.match(/pragma\s+solidity\s+\^?([0-9]+\.[0-9]+)/)?.[1];
  if (solidityVersion && parseFloat(solidityVersion) < 0.8) {
    const hasArithmetic = /[\+\-\*\/]/.test(contractCode);
    const hasSafeMath = /SafeMath/.test(contractCode);
    
    if (hasArithmetic && !hasSafeMath) {
      issues.push({
        type: "Integer overflow/underflow",
        severity: 'High',
        description: "Arithmetic operations without overflow protection in pre-0.8.0 Solidity",
        recommendation: "Use SafeMath library or upgrade to Solidity 0.8.x",
        impact: "Arithmetic operations can overflow/underflow leading to unexpected behavior"
      });
    }
  }

  // Run pattern-based checks
  lines.forEach((line, index) => {
    securityChecks.forEach(check => {
      if (check.pattern.test(line)) {
        issues.push({
          type: check.type,
          severity: check.severity,
          line: index + 1,
          description: check.description,
          recommendation: check.recommendation,
          impact: check.impact
        });
      }
    });
  });

  // Gas optimization suggestions
  if (contractCode.includes('public') && contractCode.includes('view')) {
    gasOptimizations.push("Consider using 'external' instead of 'public' for functions only called externally");
  }
  
  if (contractCode.includes('string') && contractCode.includes('memory')) {
    gasOptimizations.push("Consider using 'bytes32' instead of 'string' for fixed-length strings to save gas");
  }

  if (contractCode.includes('uint256')) {
    gasOptimizations.push("Consider using smaller uint types (uint128, uint64) when possible to pack structs efficiently");
  }

  if (contractCode.includes('require(') && contractCode.includes('&&')) {
    gasOptimizations.push("Split complex require statements into multiple requires for better gas efficiency and error messages");
  }

  // Calculate security score
  const criticalCount = issues.filter(i => i.severity === 'Critical').length;
  const highCount = issues.filter(i => i.severity === 'High').length;
  const mediumCount = issues.filter(i => i.severity === 'Medium').length;
  const lowCount = issues.filter(i => i.severity === 'Low').length;

  const securityScore = Math.max(0, 100 - (criticalCount * 25 + highCount * 15 + mediumCount * 8 + lowCount * 3));

  // Generate summary
  const summary = generateSummary(finalContractName, securityScore, issues.length, criticalCount, highCount);

  return {
    contractName: finalContractName,
    totalLines,
    securityScore,
    issues,
    gasOptimizations,
    summary
  };
};

const checkReentrancyPattern = (code: string): boolean => {
  // Simplified check for state changes after external calls
  const lines = code.split('\n');
  let inFunction = false;
  let hasExternalCall = false;
  let hasStateChange = false;

  for (const line of lines) {
    if (line.includes('function ')) {
      inFunction = true;
      hasExternalCall = false;
      hasStateChange = false;
    }
    
    if (line.includes('}') && inFunction) {
      if (hasExternalCall && hasStateChange) {
        return true;
      }
      inFunction = false;
    }

    if (inFunction) {
      if (/\.call\(|\.send\(|\.transfer\(/.test(line)) {
        hasExternalCall = true;
      }
      
      if (hasExternalCall && /=/.test(line) && !line.includes('require') && !line.includes('assert')) {
        hasStateChange = true;
      }
    }
  }

  return false;
};

const generateSummary = (contractName: string, score: number, totalIssues: number, critical: number, high: number): string => {
  let riskLevel = "Low";
  if (critical > 0) riskLevel = "Critical";
  else if (high > 0) riskLevel = "High";
  else if (totalIssues > 3) riskLevel = "Medium";

  return `Contract "${contractName}" analysis complete. Security Score: ${score}/100 (${riskLevel} Risk). Found ${totalIssues} issues: ${critical} Critical, ${high} High severity. ${score >= 80 ? 'Contract shows good security practices.' : score >= 60 ? 'Contract needs security improvements.' : 'Contract requires immediate security attention.'}`;
};