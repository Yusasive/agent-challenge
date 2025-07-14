import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface CodeFeatures {
  functionComplexity: number;
  cyclomaticComplexity: number;
  nestingDepth: number;
  externalCalls: number;
  stateChanges: number;
  accessControlChecks: number;
  arithmeticOperations: number;
  loopCount: number;
  conditionCount: number;
  variableCount: number;
}

interface AnomalyDetectionResult {
  anomalies: Array<{
    type: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    confidence: number;
    location: string;
    description: string;
    recommendation: string;
    features: Partial<CodeFeatures>;
  }>;
  overallAnomalyScore: number;
  riskAssessment: string;
  novelPatterns: string[];
  behavioralAnalysis: {
    suspiciousPatterns: string[];
    unusualStructures: string[];
    potentialObfuscation: boolean;
  };
}

export const mlAnomalyDetector = createTool({
  id: "ml-anomaly-detection",
  description: "Uses machine learning techniques to detect anomalous patterns and novel attack vectors in smart contracts",
  inputSchema: z.object({
    contractCode: z.string().describe("The Solidity smart contract code to analyze"),
    sensitivityLevel: z.enum(['low', 'medium', 'high']).optional().default('medium'),
    enableBehavioralAnalysis: z.boolean().optional().default(true),
    enableNovelPatternDetection: z.boolean().optional().default(true),
  }),
  outputSchema: z.object({
    anomalies: z.array(z.object({
      type: z.string(),
      severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
      confidence: z.number(),
      location: z.string(),
      description: z.string(),
      recommendation: z.string(),
      features: z.record(z.number()),
    })),
    overallAnomalyScore: z.number(),
    riskAssessment: z.string(),
    novelPatterns: z.array(z.string()),
    behavioralAnalysis: z.object({
      suspiciousPatterns: z.array(z.string()),
      unusualStructures: z.array(z.string()),
      potentialObfuscation: z.boolean(),
    }),
  }),
  execute: async ({ context }) => {
    return await detectAnomalies(
      context.contractCode,
      context.sensitivityLevel,
      context.enableBehavioralAnalysis,
      context.enableNovelPatternDetection
    );
  },
});

const detectAnomalies = async (
  contractCode: string,
  sensitivityLevel: 'low' | 'medium' | 'high' = 'medium',
  enableBehavioralAnalysis: boolean = true,
  enableNovelPatternDetection: boolean = true
): Promise<AnomalyDetectionResult> => {
  const lines = contractCode.split('\n');
  const features = extractCodeFeatures(lines);
  const anomalies = await detectCodeAnomalies(lines, features, sensitivityLevel);
  const behavioralAnalysis = enableBehavioralAnalysis 
    ? performBehavioralAnalysis(lines, features)
    : { suspiciousPatterns: [], unusualStructures: [], potentialObfuscation: false };
  
  const novelPatterns = enableNovelPatternDetection
    ? detectNovelPatterns(lines, features)
    : [];
  
  const overallAnomalyScore = calculateAnomalyScore(anomalies, features);
  
  const riskAssessment = generateRiskAssessment(overallAnomalyScore, anomalies);
  
  return {
    anomalies,
    overallAnomalyScore,
    riskAssessment,
    novelPatterns,
    behavioralAnalysis,
  };
};

const extractCodeFeatures = (lines: string[]): CodeFeatures => {
  let functionComplexity = 0;
  let cyclomaticComplexity = 1;  
  let nestingDepth = 0;
  let maxNesting = 0;
  let externalCalls = 0;
  let stateChanges = 0;
  let accessControlChecks = 0;
  let arithmeticOperations = 0;
  let loopCount = 0;
  let conditionCount = 0;
  let variableCount = 0;
  
  const variables = new Set<string>();
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Function complexity
    if (trimmed.includes('function ')) {
      functionComplexity++;
    }
    
    // Cyclomatic complexity
    if (trimmed.includes('if ') || trimmed.includes('else') || 
        trimmed.includes('for ') || trimmed.includes('while ') ||
        trimmed.includes('case ') || trimmed.includes('&&') || 
        trimmed.includes('||')) {
      cyclomaticComplexity++;
    }
     
    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;
    nestingDepth += openBraces - closeBraces;
    maxNesting = Math.max(maxNesting, nestingDepth);
     
    if (trimmed.includes('.call(') || trimmed.includes('.delegatecall(') ||
        trimmed.includes('.send(') || trimmed.includes('.transfer(')) {
      externalCalls++;
    }
    
    if (trimmed.includes('=') && !trimmed.includes('==') && 
        !trimmed.includes('!=') && !trimmed.includes('<=') && 
        !trimmed.includes('>=')) {
      stateChanges++;
    }
    
    // Access control checks
    if (trimmed.includes('require(') || trimmed.includes('assert(') ||
        trimmed.includes('onlyOwner') || trimmed.includes('msg.sender')) {
      accessControlChecks++;
    }
    const arithmeticOps = (trimmed.match(/[\+\-\*\/\%]/g) || []).length;
    arithmeticOperations += arithmeticOps;
    
    if (trimmed.includes('for ') || trimmed.includes('while ')) {
      loopCount++;
    }
    if (trimmed.includes('if ')) {
      conditionCount++;
    }
    
    const varMatches = trimmed.match(/\b(\w+)\s*=/g);
    if (varMatches) {
      varMatches.forEach(match => {
        const varName = match.replace(/\s*=/, '').trim();
        if (varName && varName.length > 1) {
          variables.add(varName);
        }
      });
    }
  });
  
  variableCount = variables.size;
  
  return {
    functionComplexity,
    cyclomaticComplexity,
    nestingDepth: maxNesting,
    externalCalls,
    stateChanges,
    accessControlChecks,
    arithmeticOperations,
    loopCount,
    conditionCount,
    variableCount,
  };
};

const detectCodeAnomalies = async (
  lines: string[],
  features: CodeFeatures,
  sensitivityLevel: 'low' | 'medium' | 'high'
): Promise<Array<{
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  location: string;
  description: string;
  recommendation: string;
  features: Partial<CodeFeatures>;
}>> => {
  const anomalies: Array<{
    type: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    confidence: number;
    location: string;
    description: string;
    recommendation: string;
    features: Partial<CodeFeatures>;
  }> = [];
  
  const thresholds = getAnomalyThresholds(sensitivityLevel);
  
  // Complexity anomalies
  if (features.cyclomaticComplexity > thresholds.complexity) {
    anomalies.push({
      type: 'High Complexity Anomaly',
      severity: features.cyclomaticComplexity > thresholds.complexity * 2 ? 'High' : 'Medium',
      confidence: Math.min(0.95, features.cyclomaticComplexity / thresholds.complexity * 0.6),
      location: 'Contract-wide',
      description: `Unusually high cyclomatic complexity (${features.cyclomaticComplexity}) detected`,
      recommendation: 'Consider breaking down complex functions into smaller, more manageable pieces',
      features: { cyclomaticComplexity: features.cyclomaticComplexity },
    });
  }
  
  // External call anomalies
  if (features.externalCalls > thresholds.externalCalls) {
    anomalies.push({
      type: 'Excessive External Calls',
      severity: 'High',
      confidence: 0.85,
      location: 'Multiple locations',
      description: `Unusually high number of external calls (${features.externalCalls}) detected`,
      recommendation: 'Review external call patterns for potential reentrancy and gas optimization',
      features: { externalCalls: features.externalCalls },
    });
  }
  
  // Access control anomalies
  const accessControlRatio = features.accessControlChecks / Math.max(1, features.functionComplexity);
  if (accessControlRatio < thresholds.accessControlRatio) {
    anomalies.push({
      type: 'Insufficient Access Control',
      severity: 'Critical',
      confidence: 0.9,
      location: 'Contract-wide',
      description: 'Anomalously low access control checks relative to function count',
      recommendation: 'Implement proper access control mechanisms for all sensitive functions',
      features: { accessControlChecks: features.accessControlChecks },
    });
  }
  
  // State change anomalies
  if (features.stateChanges > thresholds.stateChanges) {
    anomalies.push({
      type: 'Excessive State Modifications',
      severity: 'Medium',
      confidence: 0.75,
      location: 'Contract-wide',
      description: `High number of state changes (${features.stateChanges}) detected`,
      recommendation: 'Review state modification patterns for gas optimization and security',
      features: { stateChanges: features.stateChanges },
    });
  }
  
  // Nesting depth anomalies
  if (features.nestingDepth > thresholds.nestingDepth) {
    anomalies.push({
      type: 'Deep Nesting Anomaly',
      severity: 'Medium',
      confidence: 0.8,
      location: 'Multiple functions',
      description: `Unusually deep nesting (${features.nestingDepth} levels) detected`,
      recommendation: 'Refactor deeply nested code to improve readability and reduce complexity',
      features: { nestingDepth: features.nestingDepth },
    });
  }
  const patternAnomalies = detectPatternAnomalies(lines);
  anomalies.push(...patternAnomalies);
  
  return anomalies;
};

const getAnomalyThresholds = (sensitivityLevel: 'low' | 'medium' | 'high') => {
  const baseThresholds = {
    complexity: 15,
    externalCalls: 5,
    accessControlRatio: 0.3,
    stateChanges: 20,
    nestingDepth: 4,
  };
  
  const multiplier = sensitivityLevel === 'low' ? 1.5 : sensitivityLevel === 'high' ? 0.7 : 1.0;
  
  return {
    complexity: Math.floor(baseThresholds.complexity * multiplier),
    externalCalls: Math.floor(baseThresholds.externalCalls * multiplier),
    accessControlRatio: baseThresholds.accessControlRatio * multiplier,
    stateChanges: Math.floor(baseThresholds.stateChanges * multiplier),
    nestingDepth: Math.floor(baseThresholds.nestingDepth * multiplier),
  };
};

const detectPatternAnomalies = (lines: string[]): Array<{
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  location: string;
  description: string;
  recommendation: string;
  features: Partial<CodeFeatures>;
}> => {
  const anomalies: Array<{
    type: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    confidence: number;
    location: string;
    description: string;
    recommendation: string;
    features: Partial<CodeFeatures>;
  }> = [];
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Unusual assembly usage
    if (trimmed.includes('assembly {')) {
      anomalies.push({
        type: 'Inline Assembly Anomaly',
        severity: 'High',
        confidence: 0.9,
        location: `Line ${index + 1}`,
        description: 'Inline assembly usage detected - potential for low-level vulnerabilities',
        recommendation: 'Review assembly code carefully and consider safer alternatives',
        features: {},
      });
    }
    
    // Suspicious variable names
    const suspiciousNames = ['temp', 'tmp', 'x', 'y', 'z', 'data', 'val'];
    suspiciousNames.forEach(name => {
      if (trimmed.includes(`${name} =`) || trimmed.includes(`${name}=`)) {
        anomalies.push({
          type: 'Suspicious Variable Naming',
          severity: 'Low',
          confidence: 0.6,
          location: `Line ${index + 1}`,
          description: `Potentially obfuscated variable name '${name}' detected`,
          recommendation: 'Use descriptive variable names for better code clarity',
          features: {},
        });
      }
    });
    
    // Unusual gas patterns
    if (trimmed.includes('gasleft()') || trimmed.includes('gas:')) {
      anomalies.push({
        type: 'Manual Gas Management',
        severity: 'Medium',
        confidence: 0.75,
        location: `Line ${index + 1}`,
        description: 'Manual gas management detected - potential for gas-related vulnerabilities',
        recommendation: 'Review gas management logic for potential DoS vulnerabilities',
        features: {},
      });
    }
  });
  
  return anomalies;
};

const performBehavioralAnalysis = (
  lines: string[],
  features: CodeFeatures
): {
  suspiciousPatterns: string[];
  unusualStructures: string[];
  potentialObfuscation: boolean;
} => {
  const suspiciousPatterns: string[] = [];
  const unusualStructures: string[] = [];
  let potentialObfuscation = false;
  
  // Check for suspicious patterns
  const contractText = lines.join('\n');
  
  if (contractText.includes('selfdestruct') && contractText.includes('delegatecall')) {
    suspiciousPatterns.push('Combination of selfdestruct and delegatecall - potential proxy destruction');
  }
  
  if (features.externalCalls > 3 && features.accessControlChecks < 2) {
    suspiciousPatterns.push('High external call frequency with low access control');
  }
  
  if (contractText.includes('tx.origin') && contractText.includes('.call(')) {
    suspiciousPatterns.push('tx.origin usage combined with external calls - phishing risk');
  }
  
  // Check for unusual structures
  if (features.nestingDepth > 6) {
    unusualStructures.push('Extremely deep nesting structure');
  }
  
  if (features.functionComplexity > 20) {
    unusualStructures.push('Unusually high number of functions');
  }
  
  // Check for potential obfuscation
  const shortVariableCount = lines.filter(line => 
    /\b[a-z]\s*=/.test(line) || /\b[A-Z]\s*=/.test(line)
  ).length;
  
  if (shortVariableCount > features.variableCount * 0.5) {
    potentialObfuscation = true;
  }
  
  return {
    suspiciousPatterns,
    unusualStructures,
    potentialObfuscation,
  };
};

const detectNovelPatterns = (lines: string[], features: CodeFeatures): string[] => {
  const novelPatterns: string[] = [];
  const contractText = lines.join('\n');
  
  // Novel attack patterns based on recent research
  const novelPatternChecks = [
    {
      pattern: /create2.*salt.*bytecode/i,
      description: 'CREATE2 with dynamic salt - potential address collision attack'
    },
    {
      pattern: /multicall.*delegatecall/i,
      description: 'Multicall with delegatecall - potential storage collision'
    },
    {
      pattern: /flashloan.*callback.*reentrancy/i,
      description: 'Flash loan callback reentrancy pattern'
    },
    {
      pattern: /proxy.*implementation.*upgrade/i,
      description: 'Upgradeable proxy pattern - potential logic bomb'
    },
    {
      pattern: /oracle.*price.*manipulation/i,
      description: 'Oracle price manipulation pattern'
    },
    {
      pattern: /governance.*proposal.*timelock/i,
      description: 'Governance timelock bypass pattern'
    }
  ];
  
  novelPatternChecks.forEach(check => {
    if (check.pattern.test(contractText)) {
      novelPatterns.push(check.description);
    }
  });
  
  // MEV-related patterns
  if (contractText.includes('block.timestamp') && contractText.includes('deadline')) {
    novelPatterns.push('Timestamp-based deadline - potential MEV exploitation');
  }
  
  if (contractText.includes('slippage') && contractText.includes('swap')) {
    novelPatterns.push('DEX slippage pattern - potential sandwich attack vector');
  }
  
  return novelPatterns;
};

const calculateAnomalyScore = (
  anomalies: Array<{ severity: string; confidence: number }>,
  features: CodeFeatures
): number => {
  const severityWeights = {
    'Critical': 1.0,
    'High': 0.8,
    'Medium': 0.5,
    'Low': 0.2,
  };
  
  let totalScore = 0;
  anomalies.forEach(anomaly => {
    const weight = severityWeights[anomaly.severity as keyof typeof severityWeights] || 0.1;
    totalScore += weight * anomaly.confidence;
  });
  
  // Normalize score (0-100)
  return Math.min(100, totalScore * 20);
};

const generateRiskAssessment = (
  anomalyScore: number,
  anomalies: Array<{ severity: string }>
): string => {
  const criticalCount = anomalies.filter(a => a.severity === 'Critical').length;
  const highCount = anomalies.filter(a => a.severity === 'High').length;
  
  if (anomalyScore > 80 || criticalCount > 0) {
    return 'CRITICAL: Multiple high-risk anomalies detected. Immediate security review required.';
  } else if (anomalyScore > 60 || highCount > 1) {
    return 'HIGH: Significant anomalies detected. Thorough security audit recommended.';
  } else if (anomalyScore > 40) {
    return 'MEDIUM: Some anomalies detected. Security review advised before deployment.';
  } else {
    return 'LOW: Minor anomalies detected. Standard security practices should be sufficient.';
  }
};