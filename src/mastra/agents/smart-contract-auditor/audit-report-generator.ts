import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface AuditReport {
  reportId: string;
  timestamp: string;
  contractName: string;
  executiveSummary: string;
  securityScore: number;
  riskLevel: string;
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  detailedFindings: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
    impact: string;
    recommendation: string;
    location?: string;
  }>;
  gasOptimizations: string[];
  recommendations: string[];
  conclusion: string;
}

export const auditReportGenerator = createTool({
  id: "generate-audit-report",
  description: "Generates a comprehensive professional audit report from analysis results",
  inputSchema: z.object({
    contractName: z.string().describe("Name of the audited contract"),
    analysisResults: z.object({
      securityScore: z.number(),
      issues: z.array(z.any()),
      gasOptimizations: z.array(z.string()),
    }).describe("Results from contract analysis"),
    vulnerabilityResults: z.object({
      vulnerabilities: z.array(z.any()),
      overallRisk: z.string(),
      recommendations: z.array(z.string()),
    }).describe("Results from vulnerability check"),
    gasResults: z.object({
      optimizations: z.array(z.any()),
      estimatedGasSavings: z.string(),
    }).describe("Results from gas optimization analysis"),
  }),
  outputSchema: z.object({
    reportId: z.string(),
    timestamp: z.string(),
    contractName: z.string(),
    executiveSummary: z.string(),
    securityScore: z.number(),
    riskLevel: z.string(),
    findings: z.object({
      critical: z.number(),
      high: z.number(),
      medium: z.number(),
      low: z.number(),
    }),
    detailedFindings: z.array(z.object({
      id: z.string(),
      severity: z.string(),
      title: z.string(),
      description: z.string(),
      impact: z.string(),
      recommendation: z.string(),
      location: z.string().optional(),
    })),
    gasOptimizations: z.array(z.string()),
    recommendations: z.array(z.string()),
    conclusion: z.string(),
    reportMarkdown: z.string(),
  }),
  execute: async ({ context }) => {
    return await generateComprehensiveReport(
      context.contractName,
      context.analysisResults,
      context.vulnerabilityResults,
      context.gasResults
    );
  },
});

const generateComprehensiveReport = async (
  contractName: string,
  analysisResults: any,
  vulnerabilityResults: any,
  gasResults: any
): Promise<AuditReport & { reportMarkdown: string }> => {
  const reportId = `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  // Combine all findings
  const allFindings = [
    ...analysisResults.issues.map((issue: any) => ({
      id: `SEC-${Math.random().toString(36).substr(2, 6)}`,
      severity: issue.severity,
      title: issue.type,
      description: issue.description,
      impact: issue.impact,
      recommendation: issue.recommendation,
      location: issue.line ? `Line ${issue.line}` : undefined,
    })),
    ...vulnerabilityResults.vulnerabilities.map((vuln: any) => ({
      id: vuln.id,
      severity: vuln.severity,
      title: vuln.name,
      description: vuln.description,
      impact: `Potential security vulnerability: ${vuln.name}`,
      recommendation: vuln.remediation,
      location: vuln.location,
    }))
  ];
 
  const findings = {
    critical: allFindings.filter(f => f.severity === 'Critical').length,
    high: allFindings.filter(f => f.severity === 'High').length,
    medium: allFindings.filter(f => f.severity === 'Medium').length,
    low: allFindings.filter(f => f.severity === 'Low').length,
  };
 
  let riskLevel = "Low";
  if (findings.critical > 0) riskLevel = "Critical";
  else if (findings.high > 0) riskLevel = "High";
  else if (findings.medium > 2) riskLevel = "Medium";
 
  const executiveSummary = generateExecutiveSummary(
    contractName,
    analysisResults.securityScore,
    findings,
    riskLevel
  );
 
  const recommendations = [
    ...vulnerabilityResults.recommendations,
    ...gasResults.optimizations.map((opt: any) => opt.recommendation),
    "Implement comprehensive unit tests covering all edge cases",
    "Consider formal verification for critical functions",
    "Set up continuous security monitoring",
  ];
 
  const conclusion = generateConclusion(analysisResults.securityScore, riskLevel, findings);

  const report: AuditReport = {
    reportId,
    timestamp,
    contractName,
    executiveSummary,
    securityScore: analysisResults.securityScore,
    riskLevel,
    findings,
    detailedFindings: allFindings,
    gasOptimizations: gasResults.optimizations.map((opt: any) => 
      `${opt.type}: ${opt.description} (${opt.estimatedSavings})`
    ),
    recommendations: recommendations.slice(0, 10), 
    conclusion,
  };

  const reportMarkdown = generateMarkdownReport(report);

  return {
    ...report,
    reportMarkdown,
  };
};

const generateExecutiveSummary = (
  contractName: string,
  securityScore: number,
  findings: any,
  riskLevel: string
): string => {
  const totalIssues = findings.critical + findings.high + findings.medium + findings.low;
  
  return `This security audit of the "${contractName}" smart contract reveals a security score of ${securityScore}/100 with an overall risk level of ${riskLevel}. 

The analysis identified ${totalIssues} total findings: ${findings.critical} critical, ${findings.high} high, ${findings.medium} medium, and ${findings.low} low severity issues. 

${securityScore >= 80 
  ? "The contract demonstrates good security practices with minor improvements needed."
  : securityScore >= 60 
  ? "The contract requires moderate security improvements before deployment."
  : "The contract needs significant security enhancements and should not be deployed in its current state."
}

Key areas of concern include ${findings.critical > 0 ? "critical security vulnerabilities" : findings.high > 0 ? "high-severity security issues" : "moderate security improvements"} that require immediate attention.`;
};

const generateConclusion = (securityScore: number, riskLevel: string, findings: any): string => {
  if (securityScore >= 85 && riskLevel === "Low") {
    return "The smart contract demonstrates excellent security practices and is ready for deployment with minor optimizations.";
  } else if (securityScore >= 70 && (riskLevel === "Low" || riskLevel === "Medium")) {
    return "The smart contract shows good security fundamentals but requires addressing identified issues before deployment.";
  } else if (findings.critical > 0) {
    return "The smart contract contains critical security vulnerabilities that must be resolved before any deployment consideration.";
  } else {
    return "The smart contract requires significant security improvements and thorough testing before deployment.";
  }
};

const generateMarkdownReport = (report: AuditReport): string => {
  return `# Smart Contract Security Audit Report

## Contract Information
- **Contract Name**: ${report.contractName}
- **Report ID**: ${report.reportId}
- **Audit Date**: ${new Date(report.timestamp).toLocaleDateString()}
- **Security Score**: ${report.securityScore}/100
- **Risk Level**: ${report.riskLevel}

## Executive Summary

${report.executiveSummary}

## Findings Summary

| Severity | Count |
|----------|-------|
| Critical | ${report.findings.critical} |
| High     | ${report.findings.high} |
| Medium   | ${report.findings.medium} |
| Low      | ${report.findings.low} |

## Detailed Findings

${report.detailedFindings.map((finding, index) => `
### ${index + 1}. ${finding.title} (${finding.severity})

**ID**: ${finding.id}
${finding.location ? `**Location**: ${finding.location}` : ''}

**Description**: ${finding.description}

**Impact**: ${finding.impact}

**Recommendation**: ${finding.recommendation}

---
`).join('')}

## Gas Optimization Opportunities

${report.gasOptimizations.map((opt, index) => `${index + 1}. ${opt}`).join('\n')}

## Recommendations

${report.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

## Conclusion

${report.conclusion}

---

*This report was generated by the Smart Contract Auditor Agent. For questions or clarifications, please consult with a security professional.*
`;
};