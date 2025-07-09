import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface ControlFlowNode {
  id: string;
  type: 'function' | 'condition' | 'loop' | 'call' | 'return';
  code: string;
  line: number;
  children: string[];
  parents: string[];
}

interface DataFlowAnalysis {
  variable: string;
  definitions: number[];
  uses: number[];
  reachingDefinitions: Map<number, Set<number>>;
}

interface StaticAnalysisResult {
  controlFlowGraph: ControlFlowNode[];
  dataFlowAnalysis: DataFlowAnalysis[];
  taintAnalysis: {
    sources: string[];
    sinks: string[];
    vulnerablePaths: Array<{
      source: string;
      sink: string;
      path: string[];
      severity: 'Critical' | 'High' | 'Medium';
    }>;
  };
  symbolicExecution: {
    paths: Array<{
      conditions: string[];
      reachable: boolean;
      vulnerabilities: string[];
    }>;
  };
  formalProperties: {
    invariants: string[];
    preconditions: string[];
    postconditions: string[];
    violations: Array<{
      property: string;
      location: string;
      description: string;
    }>;
  };
}

export const advancedStaticAnalyzer = createTool({
  id: "advanced-static-analysis",
  description: "Performs advanced static analysis including control flow, data flow, taint analysis, and symbolic execution",
  inputSchema: z.object({
    contractCode: z.string().describe("The Solidity smart contract code to analyze"),
    analysisDepth: z.enum(['basic', 'intermediate', 'deep']).optional().default('intermediate'),
    enableSymbolicExecution: z.boolean().optional().default(true),
    enableTaintAnalysis: z.boolean().optional().default(true),
  }),
  outputSchema: z.object({
    controlFlowGraph: z.array(z.object({
      id: z.string(),
      type: z.enum(['function', 'condition', 'loop', 'call', 'return']),
      code: z.string(),
      line: z.number(),
      children: z.array(z.string()),
      parents: z.array(z.string()),
    })),
    dataFlowAnalysis: z.array(z.object({
      variable: z.string(),
      definitions: z.array(z.number()),
      uses: z.array(z.number()),
    })),
    taintAnalysis: z.object({
      sources: z.array(z.string()),
      sinks: z.array(z.string()),
      vulnerablePaths: z.array(z.object({
        source: z.string(),
        sink: z.string(),
        path: z.array(z.string()),
        severity: z.enum(['Critical', 'High', 'Medium']),
      })),
    }),
    symbolicExecution: z.object({
      paths: z.array(z.object({
        conditions: z.array(z.string()),
        reachable: z.boolean(),
        vulnerabilities: z.array(z.string()),
      })),
    }),
    formalProperties: z.object({
      invariants: z.array(z.string()),
      preconditions: z.array(z.string()),
      postconditions: z.array(z.string()),
      violations: z.array(z.object({
        property: z.string(),
        location: z.string(),
        description: z.string(),
      })),
    }),
    summary: z.string(),
  }),
  execute: async ({ context }) => {
    return await performAdvancedStaticAnalysis(
      context.contractCode,
      context.analysisDepth,
      context.enableSymbolicExecution,
      context.enableTaintAnalysis
    );
  },
});

const performAdvancedStaticAnalysis = async (
  contractCode: string,
  analysisDepth: 'basic' | 'intermediate' | 'deep' = 'intermediate',
  enableSymbolicExecution: boolean = true,
  enableTaintAnalysis: boolean = true
): Promise<StaticAnalysisResult & { summary: string }> => {
  const lines = contractCode.split('\n');
  
  // Build Control Flow Graph
  const controlFlowGraph = buildControlFlowGraph(lines);
  
  // Perform Data Flow Analysis
  const dataFlowAnalysis = performDataFlowAnalysis(lines, controlFlowGraph);
  
  // Perform Taint Analysis
  const taintAnalysis = enableTaintAnalysis 
    ? performTaintAnalysis(lines, controlFlowGraph, dataFlowAnalysis)
    : { sources: [], sinks: [], vulnerablePaths: [] };
  
  // Perform Symbolic Execution
  const symbolicExecution = enableSymbolicExecution
    ? performSymbolicExecution(lines, controlFlowGraph, analysisDepth)
    : { paths: [] };
  
  // Extract Formal Properties
  const formalProperties = extractFormalProperties(lines, controlFlowGraph);
  
  const summary = generateAdvancedAnalysisSummary(
    controlFlowGraph,
    dataFlowAnalysis,
    taintAnalysis,
    symbolicExecution,
    formalProperties
  );

  return {
    controlFlowGraph,
    dataFlowAnalysis: dataFlowAnalysis.map(df => ({
      variable: df.variable,
      definitions: df.definitions,
      uses: df.uses,
    })),
    taintAnalysis,
    symbolicExecution,
    formalProperties,
    summary,
  };
};

const buildControlFlowGraph = (lines: string[]): ControlFlowNode[] => {
  const nodes: ControlFlowNode[] = [];
  let nodeId = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('function ')) {
      nodes.push({
        id: `node_${nodeId++}`,
        type: 'function',
        code: line,
        line: i + 1,
        children: [],
        parents: [],
      });
    } else if (line.includes('if ') || line.includes('require(') || line.includes('assert(')) {
      nodes.push({
        id: `node_${nodeId++}`,
        type: 'condition',
        code: line,
        line: i + 1,
        children: [],
        parents: [],
      });
    } else if (line.includes('for ') || line.includes('while ')) {
      nodes.push({
        id: `node_${nodeId++}`,
        type: 'loop',
        code: line,
        line: i + 1,
        children: [],
        parents: [],
      });
    } else if (line.includes('.call(') || line.includes('.send(') || line.includes('.transfer(')) {
      nodes.push({
        id: `node_${nodeId++}`,
        type: 'call',
        code: line,
        line: i + 1,
        children: [],
        parents: [],
      });
    } else if (line.includes('return ')) {
      nodes.push({
        id: `node_${nodeId++}`,
        type: 'return',
        code: line,
        line: i + 1,
        children: [],
        parents: [],
      });
    }
  }
  
  // Build edges (simplified)
  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].children.push(nodes[i + 1].id);
    nodes[i + 1].parents.push(nodes[i].id);
  }
  
  return nodes;
};

const performDataFlowAnalysis = (
  lines: string[],
  cfg: ControlFlowNode[]
): DataFlowAnalysis[] => {
  const variables = new Set<string>();
  const dataFlow: DataFlowAnalysis[] = [];
  
  // Extract variables
  lines.forEach((line, index) => {
    const varMatches = line.match(/\b(\w+)\s*=/g);
    if (varMatches) {
      varMatches.forEach(match => {
        const varName = match.replace(/\s*=/, '').trim();
        if (varName && !['if', 'for', 'while', 'function'].includes(varName)) {
          variables.add(varName);
        }
      });
    }
  });
  
  // Analyze each variable
  variables.forEach(variable => {
    const definitions: number[] = [];
    const uses: number[] = [];
    
    lines.forEach((line, index) => {
      if (line.includes(`${variable} =`) || line.includes(`${variable}=`)) {
        definitions.push(index + 1);
      }
      if (line.includes(variable) && !line.includes(`${variable} =`)) {
        uses.push(index + 1);
      }
    });
    
    dataFlow.push({
      variable,
      definitions,
      uses,
      reachingDefinitions: new Map(),
    });
  });
  
  return dataFlow;
};

const performTaintAnalysis = (
  lines: string[],
  cfg: ControlFlowNode[],
  dataFlow: DataFlowAnalysis[]
): {
  sources: string[];
  sinks: string[];
  vulnerablePaths: Array<{
    source: string;
    sink: string;
    path: string[];
    severity: 'Critical' | 'High' | 'Medium';
  }>;
} => {
  // Define taint sources (user inputs)
  const sources = [
    'msg.sender',
    'msg.value',
    'msg.data',
    'tx.origin',
    'block.timestamp',
    'block.number',
    'block.coinbase',
  ];
  
  // Define taint sinks (dangerous operations)
  const sinks = [
    '.call(',
    '.delegatecall(',
    '.send(',
    '.transfer(',
    'selfdestruct(',
    'suicide(',
  ];
  
  const vulnerablePaths: Array<{
    source: string;
    sink: string;
    path: string[];
    severity: 'Critical' | 'High' | 'Medium';
  }> = [];
  
  // Find vulnerable paths
  sources.forEach(source => {
    sinks.forEach(sink => {
      const sourceLine = lines.findIndex(line => line.includes(source));
      const sinkLine = lines.findIndex(line => line.includes(sink));
      
      if (sourceLine !== -1 && sinkLine !== -1 && sourceLine < sinkLine) {
        const severity = getSinkSeverity(sink);
        vulnerablePaths.push({
          source,
          sink,
          path: [`Line ${sourceLine + 1}`, `Line ${sinkLine + 1}`],
          severity,
        });
      }
    });
  });
  
  return {
    sources: sources.filter(source => 
      lines.some(line => line.includes(source))
    ),
    sinks: sinks.filter(sink => 
      lines.some(line => line.includes(sink))
    ),
    vulnerablePaths,
  };
};

const getSinkSeverity = (sink: string): 'Critical' | 'High' | 'Medium' => {
  if (sink.includes('delegatecall') || sink.includes('selfdestruct')) {
    return 'Critical';
  } else if (sink.includes('.call(')) {
    return 'High';
  } else {
    return 'Medium';
  }
};

const performSymbolicExecution = (
  lines: string[],
  cfg: ControlFlowNode[],
  depth: 'basic' | 'intermediate' | 'deep'
): {
  paths: Array<{
    conditions: string[];
    reachable: boolean;
    vulnerabilities: string[];
  }>;
} => {
  const paths: Array<{
    conditions: string[];
    reachable: boolean;
    vulnerabilities: string[];
  }> = [];
  
  const maxPaths = depth === 'basic' ? 5 : depth === 'intermediate' ? 15 : 50;
  
  // Simplified symbolic execution
  const conditionNodes = cfg.filter(node => node.type === 'condition');
  
  for (let i = 0; i < Math.min(conditionNodes.length, maxPaths); i++) {
    const node = conditionNodes[i];
    const conditions = [node.code];
    const vulnerabilities: string[] = [];
    
    // Check for common vulnerability patterns in conditions
    if (node.code.includes('tx.origin')) {
      vulnerabilities.push('Authorization bypass via tx.origin');
    }
    if (node.code.includes('block.timestamp') && node.code.includes('<')) {
      vulnerabilities.push('Timestamp manipulation vulnerability');
    }
    if (node.code.includes('msg.value') && !node.code.includes('require')) {
      vulnerabilities.push('Unchecked value transfer');
    }
    
    paths.push({
      conditions,
      reachable: true,
      vulnerabilities,
    });
  }
  
  return { paths };
};

const extractFormalProperties = (
  lines: string[],
  cfg: ControlFlowNode[]
): {
  invariants: string[];
  preconditions: string[];
  postconditions: string[];
  violations: Array<{
    property: string;
    location: string;
    description: string;
  }>;
} => {
  const invariants: string[] = [];
  const preconditions: string[] = [];
  const postconditions: string[] = [];
  const violations: Array<{
    property: string;
    location: string;
    description: string;
  }> = [];
  
  // Extract require statements as preconditions
  lines.forEach((line, index) => {
    if (line.includes('require(')) {
      const condition = line.match(/require\(([^)]+)\)/)?.[1];
      if (condition) {
        preconditions.push(condition.trim());
      }
    }
  });
  
  // Extract common invariants
  if (lines.some(line => line.includes('mapping') && line.includes('balance'))) {
    invariants.push('Balance mapping should never be negative');
    invariants.push('Total supply should equal sum of all balances');
  }
  
  if (lines.some(line => line.includes('owner'))) {
    invariants.push('Owner should never be zero address');
  }
  
  // Check for property violations
  lines.forEach((line, index) => {
    if (line.includes('balances[') && line.includes('=') && !line.includes('require')) {
      violations.push({
        property: 'Balance modification without validation',
        location: `Line ${index + 1}`,
        description: 'Balance should be modified only after proper validation',
      });
    }
    
    if (line.includes('owner =') && !line.includes('require')) {
      violations.push({
        property: 'Owner change without authorization check',
        location: `Line ${index + 1}`,
        description: 'Owner should only be changed by authorized parties',
      });
    }
  });
  
  return {
    invariants,
    preconditions,
    postconditions,
    violations,
  };
};

const generateAdvancedAnalysisSummary = (
  cfg: ControlFlowNode[],
  dataFlow: DataFlowAnalysis[],
  taintAnalysis: any,
  symbolicExecution: any,
  formalProperties: any
): string => {
  const cfgComplexity = cfg.length;
  const dataFlowIssues = dataFlow.filter(df => df.definitions.length > df.uses.length).length;
  const taintVulns = taintAnalysis.vulnerablePaths.length;
  const symbolicVulns = symbolicExecution.paths.reduce((acc: number, path: any) => 
    acc + path.vulnerabilities.length, 0);
  const propertyViolations = formalProperties.violations.length;
  
  return `Advanced Static Analysis Complete:
• Control Flow Complexity: ${cfgComplexity} nodes
• Data Flow Issues: ${dataFlowIssues} potential problems
• Taint Analysis: ${taintVulns} vulnerable paths found
• Symbolic Execution: ${symbolicVulns} vulnerabilities in ${symbolicExecution.paths.length} paths
• Formal Property Violations: ${propertyViolations} violations detected
• Overall Risk: ${taintVulns + symbolicVulns + propertyViolations > 5 ? 'High' : 'Medium'}`;
};