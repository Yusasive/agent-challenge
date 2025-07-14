import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface ChainConfig {
  name: string;
  id: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: string;
  contractPatterns: string[];
  specificVulnerabilities: string[];
}

interface MultiChainAnalysisResult {
  supportedChains: string[];
  detectedChain: string;
  chainSpecificIssues: Array<{
    chain: string;
    issue: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    description: string;
    recommendation: string;
  }>;
  crossChainCompatibility: {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  };
  gasOptimizations: {
    [chain: string]: Array<{
      optimization: string;
      estimatedSavings: string;
      chainSpecific: boolean;
    }>;
  };
}

export const multiChainAnalyzer = createTool({
  id: "multi-chain-analysis",
  description: "Analyzes smart contracts for multi-chain compatibility and chain-specific vulnerabilities",
  inputSchema: z.object({
    contractCode: z.string().describe("The smart contract code to analyze"),
    targetChains: z.array(z.string()).optional().describe("Specific chains to analyze for (ethereum, bsc, polygon, arbitrum, optimism)"),
    includeGasAnalysis: z.boolean().optional().default(true),
    checkCrossChainCompatibility: z.boolean().optional().default(true),
  }),
  outputSchema: z.object({
    supportedChains: z.array(z.string()),
    detectedChain: z.string(),
    chainSpecificIssues: z.array(z.object({
      chain: z.string(),
      issue: z.string(),
      severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
      description: z.string(),
      recommendation: z.string(),
    })),
    crossChainCompatibility: z.object({
      compatible: z.boolean(),
      issues: z.array(z.string()),
      recommendations: z.array(z.string()),
    }),
    gasOptimizations: z.record(z.array(z.object({
      optimization: z.string(),
      estimatedSavings: z.string(),
      chainSpecific: z.boolean(),
    }))),
    summary: z.string(),
  }),
  execute: async ({ context }) => {
    return await analyzeMultiChain(
      context.contractCode,
      context.targetChains,
      context.includeGasAnalysis,
      context.checkCrossChainCompatibility
    );
  },
});

const analyzeMultiChain = async (
  contractCode: string,
  targetChains: string[] = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'],
  includeGasAnalysis: boolean = true,
  checkCrossChainCompatibility: boolean = true
): Promise<MultiChainAnalysisResult & { summary: string }> => {
  
  const chainConfigs: { [key: string]: ChainConfig } = {
    ethereum: {
      name: "Ethereum",
      id: 1,
      rpcUrl: "https://eth.llamarpc.com",
      explorerUrl: "https://etherscan.io",
      nativeCurrency: "ETH",
      contractPatterns: ["pragma solidity", "contract"],
      specificVulnerabilities: ["high-gas-costs", "mev-attacks", "front-running"]
    },
    bsc: {
      name: "Binance Smart Chain",
      id: 56,
      rpcUrl: "https://bsc-dataseed.binance.org",
      explorerUrl: "https://bscscan.com",
      nativeCurrency: "BNB",
      contractPatterns: ["pragma solidity", "contract"],
      specificVulnerabilities: ["centralization-risks", "validator-attacks"]
    },
    polygon: {
      name: "Polygon",
      id: 137,
      rpcUrl: "https://polygon-rpc.com",
      explorerUrl: "https://polygonscan.com",
      nativeCurrency: "MATIC",
      contractPatterns: ["pragma solidity", "contract"],
      specificVulnerabilities: ["checkpoint-delays", "plasma-exits"]
    },
    arbitrum: {
      name: "Arbitrum One",
      id: 42161,
      rpcUrl: "https://arb1.arbitrum.io/rpc",
      explorerUrl: "https://arbiscan.io",
      nativeCurrency: "ETH",
      contractPatterns: ["pragma solidity", "contract"],
      specificVulnerabilities: ["sequencer-downtime", "l1-l2-messaging"]
    },
    optimism: {
      name: "Optimism",
      id: 10,
      rpcUrl: "https://mainnet.optimism.io",
      explorerUrl: "https://optimistic.etherscan.io",
      nativeCurrency: "ETH",
      contractPatterns: ["pragma solidity", "contract"],
      specificVulnerabilities: ["fraud-proofs", "withdrawal-delays"]
    }
  };

  const supportedChains = Object.keys(chainConfigs);
  const detectedChain = detectChain(contractCode, chainConfigs);
  const chainSpecificIssues = analyzeChainSpecificIssues(contractCode, targetChains, chainConfigs);
  
  const crossChainCompatibility = checkCrossChainCompatibility 
    ? analyzeCrossChainCompatibility(contractCode, targetChains, chainConfigs)
    : { compatible: true, issues: [], recommendations: [] };

  const gasOptimizations = includeGasAnalysis 
    ? analyzeChainSpecificGas(contractCode, targetChains, chainConfigs)
    : {};

  const summary = generateMultiChainSummary(
    detectedChain,
    chainSpecificIssues,
    crossChainCompatibility,
    gasOptimizations
  );

  return {
    supportedChains,
    detectedChain,
    chainSpecificIssues,
    crossChainCompatibility,
    gasOptimizations,
    summary,
  };
};

const detectChain = (contractCode: string, chainConfigs: { [key: string]: ChainConfig }): string => {
 
  if (contractCode.includes('IERC20') || contractCode.includes('OpenZeppelin')) {
    return 'ethereum';
  }
  if (contractCode.includes('PancakeSwap') || contractCode.includes('BEP20')) {
    return 'bsc';
  }
  if (contractCode.includes('QuickSwap') || contractCode.includes('Polygon')) {
    return 'polygon';
  }
  if (contractCode.includes('Arbitrum') || contractCode.includes('L2')) {
    return 'arbitrum';
  }
  if (contractCode.includes('Optimism') || contractCode.includes('OVM')) {
    return 'optimism';
  }
  
  return 'ethereum';  
};

const analyzeChainSpecificIssues = (
  contractCode: string,
  targetChains: string[],
  chainConfigs: { [key: string]: ChainConfig }
): Array<{
  chain: string;
  issue: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  recommendation: string;
}> => {
  const issues: Array<{
    chain: string;
    issue: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    description: string;
    recommendation: string;
  }> = [];

  targetChains.forEach(chain => {
    const config = chainConfigs[chain];
    if (!config) return;
 
    if (chain === 'ethereum') {
      if (contractCode.includes('for (') && contractCode.includes('++')) {
        issues.push({
          chain: 'ethereum',
          issue: 'High Gas Consumption',
          severity: 'High',
          description: 'Loops can be very expensive on Ethereum mainnet',
          recommendation: 'Consider batch operations or move to L2 for gas-intensive operations'
        });
      }
      
      if (contractCode.includes('block.timestamp') && contractCode.includes('deadline')) {
        issues.push({
          chain: 'ethereum',
          issue: 'MEV Vulnerability',
          severity: 'Medium',
          description: 'Timestamp-based logic vulnerable to MEV attacks on Ethereum',
          recommendation: 'Use commit-reveal schemes or private mempools'
        });
      }
    }
 
    if (chain === 'bsc') {
      if (contractCode.includes('onlyOwner') && !contractCode.includes('Ownable2Step')) {
        issues.push({
          chain: 'bsc',
          issue: 'Centralization Risk',
          severity: 'Medium',
          description: 'BSC has fewer validators, making centralization risks more critical',
          recommendation: 'Implement multi-sig or DAO governance instead of single owner'
        });
      }
    }
 
    if (chain === 'polygon') {
      if (contractCode.includes('withdraw') && !contractCode.includes('checkpoint')) {
        issues.push({
          chain: 'polygon',
          issue: 'Checkpoint Dependency',
          severity: 'Medium',
          description: 'Polygon withdrawals depend on Ethereum checkpoint submissions',
          recommendation: 'Implement fallback mechanisms for checkpoint delays'
        });
      }
    }
 
    if (chain === 'arbitrum') {
      if (contractCode.includes('block.number')) {
        issues.push({
          chain: 'arbitrum',
          issue: 'Block Number Inconsistency',
          severity: 'Low',
          description: 'Arbitrum block numbers may not match Ethereum exactly',
          recommendation: 'Use block.timestamp or Arbitrum-specific block tracking'
        });
      }
    }
  
    if (chain === 'optimism') {
      if (contractCode.includes('selfdestruct')) {
        issues.push({
          chain: 'optimism',
          issue: 'Selfdestruct Behavior',
          severity: 'High',
          description: 'Selfdestruct behavior differs on Optimism',
          recommendation: 'Avoid selfdestruct or implement Optimism-specific handling'
        });
      }
    }
  });

  return issues;
};

const analyzeCrossChainCompatibility = (
  contractCode: string,
  targetChains: string[],
  chainConfigs: { [key: string]: ChainConfig }
): {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for chain-specific dependencies
  if (contractCode.includes('chainid') || contractCode.includes('block.chainid')) {
    issues.push('Contract uses chain ID which will differ across chains');
    recommendations.push('Make chain ID configurable or use chain-agnostic logic');
  }

  // Check for hardcoded addresses
  const addressPattern = /0x[a-fA-F0-9]{40}/g;
  const addresses = contractCode.match(addressPattern);
  if (addresses && addresses.length > 0) {
    issues.push('Contract contains hardcoded addresses that may not exist on all chains');
    recommendations.push('Use factory patterns or configurable addresses for cross-chain deployment');
  }

  // Check for gas assumptions
  if (contractCode.includes('gasleft()') || contractCode.includes('gas:')) {
    issues.push('Contract makes gas assumptions that may not hold across different chains');
    recommendations.push('Make gas limits configurable or use chain-specific gas strategies');
  }

  const compatible = issues.length === 0;

  return {
    compatible,
    issues,
    recommendations,
  };
};

const analyzeChainSpecificGas = (
  contractCode: string,
  targetChains: string[],
  chainConfigs: { [key: string]: ChainConfig }
): { [chain: string]: Array<{
  optimization: string;
  estimatedSavings: string;
  chainSpecific: boolean;
}> } => {
  const gasOptimizations: { [chain: string]: Array<{
    optimization: string;
    estimatedSavings: string;
    chainSpecific: boolean;
  }> } = {};

  targetChains.forEach(chain => {
    gasOptimizations[chain] = [];

    if (chain === 'ethereum') {
      // Ethereum-specific optimizations
      if (contractCode.includes('SSTORE')) {
        gasOptimizations[chain].push({
          optimization: 'Minimize storage operations',
          estimatedSavings: '15,000-20,000 gas per SSTORE',
          chainSpecific: false
        });
      }
      
      gasOptimizations[chain].push({
        optimization: 'Consider L2 deployment for gas-intensive operations',
        estimatedSavings: '90-95% gas cost reduction',
        chainSpecific: true
      });
    }

    if (chain === 'polygon') {
      gasOptimizations[chain].push({
        optimization: 'Optimize for MATIC gas token',
        estimatedSavings: '~100x cheaper than Ethereum',
        chainSpecific: true
      });
    }

    if (chain === 'arbitrum' || chain === 'optimism') {
      gasOptimizations[chain].push({
        optimization: 'Leverage L2 gas efficiency',
        estimatedSavings: '90-95% reduction vs Ethereum',
        chainSpecific: true
      });
    }
  });

  return gasOptimizations;
};

const generateMultiChainSummary = (
  detectedChain: string,
  issues: any[],
  compatibility: any,
  gasOptimizations: any
): string => {
  const totalIssues = issues.length;
  const criticalIssues = issues.filter(i => i.severity === 'Critical').length;
  
  return `Multi-Chain Analysis Complete:
• Detected Chain: ${detectedChain}
• Chain-Specific Issues: ${totalIssues} (${criticalIssues} critical)
• Cross-Chain Compatible: ${compatibility.compatible ? 'Yes' : 'No'}
• Gas Optimizations: Available for ${Object.keys(gasOptimizations).length} chains
• Recommendation: ${compatibility.compatible ? 'Ready for multi-chain deployment' : 'Address compatibility issues before cross-chain deployment'}`;
};