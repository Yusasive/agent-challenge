import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface GasOptimization {
  type: string;
  description: string;
  recommendation: string;
  estimatedSavings: string;
  line?: number;
}

interface GasAnalysisResult {
  totalOptimizations: number;
  estimatedGasSavings: string;
  optimizations: GasOptimization[];
  optimizedCode?: string;
}

export const gasOptimizerTool = createTool({
  id: "optimize-gas-usage",
  description: "Analyzes smart contract code for gas optimization opportunities",
  inputSchema: z.object({
    contractCode: z.string().describe("The Solidity smart contract code to optimize"),
    generateOptimizedCode: z.boolean().optional().describe("Whether to generate optimized code suggestions"),
  }),
  outputSchema: z.object({
    totalOptimizations: z.number(),
    estimatedGasSavings: z.string(),
    optimizations: z.array(z.object({
      type: z.string(),
      description: z.string(),
      recommendation: z.string(),
      estimatedSavings: z.string(),
      line: z.number().optional(),
    })),
    optimizedCode: z.string().optional(),
  }),
  execute: async ({ context }) => {
    return await analyzeGasOptimizations(context.contractCode, context.generateOptimizedCode);
  },
});

const analyzeGasOptimizations = async (contractCode: string, generateOptimizedCode?: boolean): Promise<GasAnalysisResult> => {
  const lines = contractCode.split('\n');
  const optimizations: GasOptimization[] = [];

  // Gas optimization patterns
  const gasChecks = [
    {
      pattern: /function\s+\w+\s*\([^)]*\)\s+public\s+view/g,
      type: "Function visibility",
      description: "Public view function that could be external",
      recommendation: "Change 'public' to 'external' for functions only called externally",
      estimatedSavings: "~24 gas per call"
    },
    {
      pattern: /uint256/g,
      type: "Variable packing",
      description: "Using uint256 where smaller types could work",
      recommendation: "Consider uint128, uint64, or uint32 for smaller values to enable struct packing",
      estimatedSavings: "~2000-5000 gas per storage slot saved"
    },
    {
      pattern: /string\s+memory/g,
      type: "String usage",
      description: "Using string type for potentially fixed-length data",
      recommendation: "Use bytes32 for fixed-length strings to save gas",
      estimatedSavings: "~1000-3000 gas per operation"
    },
    {
      pattern: /require\s*\([^)]*&&[^)]*\)/g,
      type: "Complex require statements",
      description: "Complex require statement with multiple conditions",
      recommendation: "Split into multiple require statements for better gas efficiency and error reporting",
      estimatedSavings: "~50-100 gas per condition"
    },
    {
      pattern: /\.length\s*>\s*0/g,
      type: "Array length check",
      description: "Checking array length > 0",
      recommendation: "Use 'array.length != 0' instead of 'array.length > 0'",
      estimatedSavings: "~6 gas per check"
    },
    {
      pattern: /\+\+\w+/g,
      type: "Pre-increment usage",
      description: "Using pre-increment in loops",
      recommendation: "Use unchecked increment in loops for Solidity 0.8+",
      estimatedSavings: "~30-40 gas per iteration"
    },
    {
      pattern: /mapping\s*\(\s*\w+\s*=>\s*bool\s*\)/g,
      type: "Boolean mapping",
      description: "Using boolean mapping for existence checks",
      recommendation: "Consider using mapping to uint256 and check != 0 for gas savings",
      estimatedSavings: "~20000 gas for SSTORE operations"
    }
  ];

  // Analyze each line
  lines.forEach((line, index) => {
    gasChecks.forEach(check => {
      const matches = line.match(check.pattern);
      if (matches) {
        optimizations.push({
          type: check.type,
          description: check.description,
          recommendation: check.recommendation,
          estimatedSavings: check.estimatedSavings,
          line: index + 1
        });
      }
    });
  });

  // Check for storage vs memory usage
  const storagePattern = /\w+\s+storage\s+\w+/g;
  const memoryPattern = /\w+\s+memory\s+\w+/g;
  const storageMatches = contractCode.match(storagePattern) || [];
  const memoryMatches = contractCode.match(memoryPattern) || [];

  if (storageMatches.length > memoryMatches.length) {
    optimizations.push({
      type: "Storage vs Memory",
      description: "Heavy usage of storage variables in functions",
      recommendation: "Cache storage variables in memory when accessed multiple times",
      estimatedSavings: "~100-200 gas per cached access"
    });
  }

  // Check for redundant operations
  if (contractCode.includes('SafeMath') && contractCode.includes('pragma solidity ^0.8')) {
    optimizations.push({
      type: "Redundant SafeMath",
      description: "Using SafeMath with Solidity 0.8+ which has built-in overflow protection",
      recommendation: "Remove SafeMath library usage to save gas",
      estimatedSavings: "~300-500 gas per arithmetic operation"
    });
  }

  // Check for event optimization
  const eventPattern = /event\s+\w+\s*\([^)]*\)/g;
  const events = contractCode.match(eventPattern) || [];
  if (events.length > 0) {
    optimizations.push({
      type: "Event optimization",
      description: "Events detected - ensure proper indexing",
      recommendation: "Use 'indexed' keyword for up to 3 parameters that will be filtered",
      estimatedSavings: "Improved query performance, no direct gas savings"
    });
  }

  // Calculate total estimated savings
  const totalOptimizations = optimizations.length;
  const estimatedGasSavings = totalOptimizations > 0 
    ? `${totalOptimizations * 500}-${totalOptimizations * 2000} gas per transaction`
    : "No significant optimizations found";

  // Generate optimized code if requested
  let optimizedCode: string | undefined;
  if (generateOptimizedCode && optimizations.length > 0) {
    optimizedCode = generateOptimizedCodeSuggestions(contractCode, optimizations);
  }

  return {
    totalOptimizations,
    estimatedGasSavings,
    optimizations,
    optimizedCode
  };
};

const generateOptimizedCodeSuggestions = (originalCode: string, optimizations: GasOptimization[]): string => {
  let optimizedCode = originalCode;
  
  // Apply basic optimizations
  optimizedCode = optimizedCode.replace(/function\s+(\w+)\s*\([^)]*\)\s+public\s+view/g, 
    'function $1() external view');
  
  optimizedCode = optimizedCode.replace(/\.length\s*>\s*0/g, '.length != 0');
  
  optimizedCode = optimizedCode.replace(/require\s*\(([^)]*&&[^)]*)\)/g, (match, condition) => {
    const conditions = condition.split('&&').map((c: string) => c.trim());
    return conditions.map((c: string) => `require(${c});`).join('\n        ');
  });

  return `// OPTIMIZED CODE SUGGESTIONS:\n// ${optimizations.length} optimizations applied\n\n${optimizedCode}`;
};