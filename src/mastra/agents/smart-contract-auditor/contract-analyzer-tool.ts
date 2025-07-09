import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface SecurityIssue {
  type: string;
  severity: "Critical" | "High" | "Medium" | "Low";
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
  description:
    "Performs comprehensive security analysis of Solidity smart contracts. Use for initial contract assessment.",
  inputSchema: z.object({
    contractCode: z
      .string()
      .min(1, "Contract code cannot be empty")
      .max(50000, "Contract code too large (max 50KB)")
      .describe("The Solidity smart contract code to analyze"),
    contractName: z
      .string()
      .optional()
      .describe("Optional name of the contract"),
  }),
  outputSchema: z.object({
    contractName: z.string(),
    totalLines: z.number(),
    securityScore: z.number().min(0).max(100),
    issues: z.array(
      z.object({
        type: z.string(),
        severity: z.enum(["Critical", "High", "Medium", "Low"]),
        line: z.number().optional(),
        description: z.string(),
        recommendation: z.string(),
        impact: z.string(),
      })
    ),
    gasOptimizations: z.array(z.string()),
    summary: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      // Add timeout protection for large contracts
      const startTime = Date.now();
      const maxAnalysisTime = 30000; // 30 seconds max

      const result = await Promise.race([
        analyzeContract(context.contractCode, context.contractName),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Analysis timeout - contract too complex")),
            maxAnalysisTime
          )
        ),
      ]);

      const analysisTime = Date.now() - startTime;
      console.log(`Contract analysis completed in ${analysisTime}ms`);

      return result;
    } catch (error) {
      console.error("Contract analysis error:", error);
      throw new Error(
        `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

const analyzeContract = async (
  contractCode: string,
  contractName?: string
): Promise<AnalysisResult> => {
  // Input validation and sanitization
  if (!contractCode || contractCode.trim().length === 0) {
    throw new Error("Contract code cannot be empty");
  }

  // Remove potentially dangerous content
  const sanitizedCode = contractCode
    .replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
    .replace(/<script[\s\S]*?<\/script>/gi, "") // Remove script tags
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .trim();

  const lines = sanitizedCode.split("\n");
  const totalLines = lines.length;
  const issues: SecurityIssue[] = [];
  const gasOptimizations: string[] = [];

  // Extract contract name if not provided
  const nameMatch = sanitizedCode.match(/contract\s+(\w+)/);
  const finalContractName = contractName || nameMatch?.[1] || "UnknownContract";

  // Quick validation for Solidity code
  const hasPragma = /pragma\s+solidity/i.test(sanitizedCode);
  const hasContract = /contract\s+\w+/i.test(sanitizedCode);

  if (!hasPragma && !hasContract) {
    throw new Error("Input does not appear to be valid Solidity code");
  }

  // Security Analysis Patterns - optimized for speed
  const securityChecks = [
    {
      pattern: /\.call\s*\(/g,
      type: "Low-level call",
      severity: "High" as const,
      description: "Usage of low-level call() function detected",
      recommendation:
        "Use specific function calls or implement proper error handling and reentrancy protection",
      impact: "Potential for reentrancy attacks and unexpected behavior",
    },
    {
      pattern: /tx\.origin/g,
      type: "tx.origin usage",
      severity: "Critical" as const,
      description: "Usage of tx.origin for authorization detected",
      recommendation: "Use msg.sender instead of tx.origin for access control",
      impact:
        "Vulnerable to phishing attacks where malicious contracts can impersonate users",
    },
    {
      pattern: /selfdestruct\s*\(/g,
      type: "Self-destruct",
      severity: "High" as const,
      description: "Self-destruct functionality detected",
      recommendation:
        "Ensure proper access controls and consider the implications of contract destruction",
      impact:
        "Contract can be permanently destroyed, potentially locking funds",
    },
    {
      pattern: /block\.timestamp|now/g,
      type: "Timestamp dependency",
      severity: "Medium" as const,
      description: "Dependency on block timestamp detected",
      recommendation:
        "Avoid using timestamps for critical logic or implement tolerance ranges",
      impact: "Miners can manipulate timestamps within reasonable bounds",
    },
    {
      pattern: /pragma\s+solidity\s+\^?[0-4]\./g,
      type: "Outdated Solidity version",
      severity: "Medium" as const,
      description: "Outdated Solidity version detected",
      recommendation:
        "Update to Solidity 0.8.x or later for built-in overflow protection",
      impact: "Missing security features and potential vulnerabilities",
    },
  ];

  // Quick reentrancy check
  const hasExternalCalls = /\.call\(|\.send\(|\.transfer\(/.test(sanitizedCode);
  const hasStateChangesAfterCalls = checkReentrancyPattern(sanitizedCode);

  if (hasExternalCalls && hasStateChangesAfterCalls) {
    issues.push({
      type: "Reentrancy vulnerability",
      severity: "Critical",
      description:
        "Potential reentrancy vulnerability detected - state changes after external calls",
      recommendation:
        "Implement checks-effects-interactions pattern or use ReentrancyGuard",
      impact: "Attackers can drain contract funds through recursive calls",
    });
  }

  // Check for integer overflow/underflow (pre-0.8.0)
  const solidityVersion = sanitizedCode.match(
    /pragma\s+solidity\s+\^?([0-9]+\.[0-9]+)/
  )?.[1];
  if (solidityVersion && parseFloat(solidityVersion) < 0.8) {
    const hasArithmetic = /[\+\-\*\/]/.test(sanitizedCode);
    const hasSafeMath = /SafeMath/.test(sanitizedCode);

    if (hasArithmetic && !hasSafeMath) {
      issues.push({
        type: "Integer overflow/underflow",
        severity: "High",
        description:
          "Arithmetic operations without overflow protection in pre-0.8.0 Solidity",
        recommendation: "Use SafeMath library or upgrade to Solidity 0.8.x",
        impact:
          "Arithmetic operations can overflow/underflow leading to unexpected behavior",
      });
    }
  }

  // Run pattern-based checks (limit to first 100 lines for performance)
  const linesToCheck = Math.min(lines.length, 100);
  for (let i = 0; i < linesToCheck; i++) {
    const line = lines[i];
    for (const check of securityChecks) {
      if (check.pattern.test(line)) {
        issues.push({
          type: check.type,
          severity: check.severity,
          line: i + 1,
          description: check.description,
          recommendation: check.recommendation,
          impact: check.impact,
        });
        break; // Only one issue per line to avoid duplicates
      }
    }
  }

  // Quick gas optimization suggestions
  if (sanitizedCode.includes("public") && sanitizedCode.includes("view")) {
    gasOptimizations.push(
      "Consider using 'external' instead of 'public' for functions only called externally"
    );
  }

  if (sanitizedCode.includes("uint256")) {
    gasOptimizations.push(
      "Consider using smaller uint types when possible to pack structs efficiently"
    );
  }

  // Calculate security score
  const criticalCount = issues.filter((i) => i.severity === "Critical").length;
  const highCount = issues.filter((i) => i.severity === "High").length;
  const mediumCount = issues.filter((i) => i.severity === "Medium").length;
  const lowCount = issues.filter((i) => i.severity === "Low").length;

  const securityScore = Math.max(
    0,
    100 - (criticalCount * 25 + highCount * 15 + mediumCount * 8 + lowCount * 3)
  );

  // Generate summary
  const summary = generateSummary(
    finalContractName,
    securityScore,
    issues.length,
    criticalCount,
    highCount
  );

  return {
    contractName: finalContractName,
    totalLines,
    securityScore,
    issues: issues.slice(0, 20), // Limit issues to prevent overwhelming responses
    gasOptimizations: gasOptimizations.slice(0, 5), // Limit optimizations
    summary,
  };
};

const checkReentrancyPattern = (code: string): boolean => {
  // Simplified and faster reentrancy check
  const lines = code.split("\n");
  let hasExternalCall = false;
  let hasStateChange = false;

  for (const line of lines) {
    if (/\.call\(|\.send\(|\.transfer\(/.test(line)) {
      hasExternalCall = true;
    }

    if (
      hasExternalCall &&
      /=/.test(line) &&
      !line.includes("require") &&
      !line.includes("assert")
    ) {
      hasStateChange = true;
      break; // Found pattern, no need to continue
    }
  }

  return hasExternalCall && hasStateChange;
};

const generateSummary = (
  contractName: string,
  score: number,
  totalIssues: number,
  critical: number,
  high: number
): string => {
  let riskLevel = "Low";
  if (critical > 0) riskLevel = "Critical";
  else if (high > 0) riskLevel = "High";
  else if (totalIssues > 3) riskLevel = "Medium";

  return `Contract "${contractName}" analysis complete. Security Score: ${score}/100 (${riskLevel} Risk). Found ${totalIssues} issues: ${critical} Critical, ${high} High severity. ${score >= 80 ? "Contract shows good security practices." : score >= 60 ? "Contract needs security improvements." : "Contract requires immediate security attention."}`;
};
