import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface AccessibilityReport {
  simplifiedSummary: {
    overallRisk: "Safe" | "Caution" | "Dangerous";
    riskScore: number;
    mainConcerns: string[];
    actionRequired: string;
    timeToFix: string;
  };
  developerFriendly: {
    codeQuality: {
      score: number;
      issues: string[];
      improvements: string[];
    };
    bestPractices: {
      following: string[];
      missing: string[];
      recommendations: string[];
    };
    securityChecklist: Array<{
      item: string;
      status: "Pass" | "Fail" | "Warning";
      explanation: string;
    }>;
  };
  businessImpact: {
    deploymentReadiness: "Ready" | "Needs Work" | "Not Ready";
    riskToUsers: string;
    riskToBusiness: string;
    recommendedActions: string[];
    estimatedCost: string;
  };
  visualSummary: {
    riskMeter: number; // 0-100
    securityGrade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
    categories: {
      [category: string]: {
        score: number;
        status: "Good" | "Fair" | "Poor";
      };
    };
  };
}

export const accessibilityEnhancer = createTool({
  id: "enhance-accessibility",
  description:
    "Makes audit results accessible to non-technical users with simplified explanations and visual summaries",
  inputSchema: z.object({
    auditResults: z
      .object({
        securityScore: z.number(),
        issues: z.array(z.any()),
        vulnerabilities: z.array(z.any()).optional(),
        gasOptimizations: z.array(z.any()).optional(),
      })
      .describe("Raw audit results to make accessible"),
    targetAudience: z
      .enum(["developer", "business", "general"])
      .optional()
      .default("general"),
    includeVisuals: z.boolean().optional().default(true),
    simplificationLevel: z
      .enum(["basic", "intermediate", "detailed"])
      .optional()
      .default("basic"),
  }),
  outputSchema: z.object({
    simplifiedSummary: z.object({
      overallRisk: z.enum(["Safe", "Caution", "Dangerous"]),
      riskScore: z.number(),
      mainConcerns: z.array(z.string()),
      actionRequired: z.string(),
      timeToFix: z.string(),
    }),
    developerFriendly: z.object({
      codeQuality: z.object({
        score: z.number(),
        issues: z.array(z.string()),
        improvements: z.array(z.string()),
      }),
      bestPractices: z.object({
        following: z.array(z.string()),
        missing: z.array(z.string()),
        recommendations: z.array(z.string()),
      }),
      securityChecklist: z.array(
        z.object({
          item: z.string(),
          status: z.enum(["Pass", "Fail", "Warning"]),
          explanation: z.string(),
        })
      ),
    }),
    businessImpact: z.object({
      deploymentReadiness: z.enum(["Ready", "Needs Work", "Not Ready"]),
      riskToUsers: z.string(),
      riskToBusiness: z.string(),
      recommendedActions: z.array(z.string()),
      estimatedCost: z.string(),
    }),
    visualSummary: z.object({
      riskMeter: z.number(),
      securityGrade: z.enum(["A+", "A", "B+", "B", "C+", "C", "D", "F"]),
      categories: z.record(
        z.object({
          score: z.number(),
          status: z.enum(["Good", "Fair", "Poor"]),
        })
      ),
    }),
    markdownReport: z.string(),
  }),
  execute: async ({ context }) => {
    return await enhanceAccessibility(
      context.auditResults,
      context.targetAudience,
      context.includeVisuals,
      context.simplificationLevel
    );
  },
});

const enhanceAccessibility = async (
  auditResults: any,
  targetAudience: "developer" | "business" | "general" = "general",
  includeVisuals: boolean = true,
  simplificationLevel: "basic" | "intermediate" | "detailed" = "basic"
): Promise<AccessibilityReport & { markdownReport: string }> => {
  const simplifiedSummary = generateSimplifiedSummary(auditResults);
  const developerFriendly = generateDeveloperFriendlyReport(auditResults);
  const businessImpact = generateBusinessImpactReport(auditResults);
  const visualSummary = generateVisualSummary(auditResults);

  const markdownReport = generateAccessibleMarkdownReport(
    simplifiedSummary,
    developerFriendly,
    businessImpact,
    visualSummary,
    targetAudience
  );

  return {
    simplifiedSummary,
    developerFriendly,
    businessImpact,
    visualSummary,
    markdownReport,
  };
};

const generateSimplifiedSummary = (
  auditResults: any
): AccessibilityReport["simplifiedSummary"] => {
  const securityScore = auditResults.securityScore || 0;
  const issues = auditResults.issues || [];
  const vulnerabilities = auditResults.vulnerabilities || [];

  const criticalIssues = [...issues, ...vulnerabilities].filter(
    (item) => item.severity === "Critical"
  );
  const highIssues = [...issues, ...vulnerabilities].filter(
    (item) => item.severity === "High"
  );

  let overallRisk: "Safe" | "Caution" | "Dangerous";
  let actionRequired: string;
  let timeToFix: string;

  if (criticalIssues.length > 0) {
    overallRisk = "Dangerous";
    actionRequired = "STOP - Do not deploy. Fix critical issues immediately.";
    timeToFix = "1-3 days";
  } else if (highIssues.length > 0 || securityScore < 70) {
    overallRisk = "Caution";
    actionRequired = "Review and fix issues before deployment.";
    timeToFix = "3-7 days";
  } else {
    overallRisk = "Safe";
    actionRequired = "Minor improvements recommended, but safe to deploy.";
    timeToFix = "1-2 days";
  }

  const mainConcerns = [
    ...criticalIssues
      .slice(0, 3)
      .map(
        (issue) =>
          `🚨 ${issue.type || issue.name}: ${simplifyTechnicalTerm(issue.description)}`
      ),
    ...highIssues
      .slice(0, 2)
      .map(
        (issue) =>
          `⚠️ ${issue.type || issue.name}: ${simplifyTechnicalTerm(issue.description)}`
      ),
  ];

  return {
    overallRisk,
    riskScore: securityScore,
    mainConcerns,
    actionRequired,
    timeToFix,
  };
};

const generateDeveloperFriendlyReport = (
  auditResults: any
): AccessibilityReport["developerFriendly"] => {
  const issues = auditResults.issues || [];
  const gasOptimizations = auditResults.gasOptimizations || [];

  const codeQuality = {
    score: auditResults.securityScore || 0,
    issues: issues.map((issue: any) => issue.type || issue.name),
    improvements: gasOptimizations.slice(0, 5),
  };

  const bestPractices = {
    following: [
      "Uses Solidity compiler",
      "Includes function visibility",
      "Has basic error handling",
    ],
    missing: issues
      .filter(
        (issue: any) =>
          issue.type?.includes("Access Control") ||
          issue.type?.includes("Reentrancy")
      )
      .map((issue: any) => issue.type),
    recommendations: [
      "Add comprehensive unit tests",
      "Implement proper access controls",
      "Use OpenZeppelin contracts",
      "Add natspec documentation",
      "Consider formal verification",
    ],
  };

  const securityChecklist = [
    {
      item: "Reentrancy Protection",
      status: issues.some((i: any) => i.type?.includes("Reentrancy"))
        ? "Fail"
        : "Pass",
      explanation: "Protects against recursive call attacks",
    },
    {
      item: "Access Control",
      status: issues.some((i: any) => i.type?.includes("Access"))
        ? "Warning"
        : "Pass",
      explanation: "Ensures only authorized users can call sensitive functions",
    },
    {
      item: "Integer Overflow Protection",
      status: issues.some((i: any) => i.type?.includes("Overflow"))
        ? "Fail"
        : "Pass",
      explanation: "Prevents arithmetic operations from wrapping around",
    },
    {
      item: "Gas Optimization",
      status: gasOptimizations.length > 0 ? "Warning" : "Pass",
      explanation: "Minimizes transaction costs for users",
    },
  ] as Array<{
    item: string;
    status: "Pass" | "Fail" | "Warning";
    explanation: string;
  }>;

  return {
    codeQuality,
    bestPractices,
    securityChecklist,
  };
};

const generateBusinessImpactReport = (
  auditResults: any
): AccessibilityReport["businessImpact"] => {
  const securityScore = auditResults.securityScore || 0;
  const issues = auditResults.issues || [];
  const criticalCount = issues.filter(
    (i: any) => i.severity === "Critical"
  ).length;
  const highCount = issues.filter((i: any) => i.severity === "High").length;

  let deploymentReadiness: "Ready" | "Needs Work" | "Not Ready";
  let riskToUsers: string;
  let riskToBusiness: string;
  let estimatedCost: string;

  if (criticalCount > 0) {
    deploymentReadiness = "Not Ready";
    riskToUsers = "HIGH - Users could lose funds or have accounts compromised";
    riskToBusiness =
      "CRITICAL - Potential for significant financial loss and reputation damage";
    estimatedCost = "$5,000 - $15,000 (emergency fixes + audit)";
  } else if (highCount > 0 || securityScore < 70) {
    deploymentReadiness = "Needs Work";
    riskToUsers = "MEDIUM - Some security concerns that should be addressed";
    riskToBusiness =
      "MODERATE - Potential for security incidents and user complaints";
    estimatedCost = "$2,000 - $8,000 (fixes + review)";
  } else {
    deploymentReadiness = "Ready";
    riskToUsers = "LOW - Minor issues that don't affect user safety";
    riskToBusiness = "LOW - Standard security posture for deployment";
    estimatedCost = "$500 - $2,000 (minor improvements)";
  }

  const recommendedActions = [
    deploymentReadiness === "Not Ready"
      ? "Halt deployment immediately"
      : "Proceed with caution",
    "Engage security team for review",
    "Plan for post-deployment monitoring",
    "Prepare incident response procedures",
    "Consider bug bounty program",
  ];

  return {
    deploymentReadiness,
    riskToUsers,
    riskToBusiness,
    recommendedActions,
    estimatedCost,
  };
};

const generateVisualSummary = (
  auditResults: any
): AccessibilityReport["visualSummary"] => {
  const securityScore = auditResults.securityScore || 0;

  let securityGrade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
  if (securityScore >= 95) securityGrade = "A+";
  else if (securityScore >= 90) securityGrade = "A";
  else if (securityScore >= 85) securityGrade = "B+";
  else if (securityScore >= 80) securityGrade = "B";
  else if (securityScore >= 75) securityGrade = "C+";
  else if (securityScore >= 70) securityGrade = "C";
  else if (securityScore >= 60) securityGrade = "D";
  else securityGrade = "F";

  const categories = {
    Security: {
      score: securityScore,
      status:
        securityScore >= 80 ? "Good" : securityScore >= 60 ? "Fair" : "Poor",
    },
    "Code Quality": {
      score: Math.min(100, securityScore + 10),
      status:
        securityScore >= 70 ? "Good" : securityScore >= 50 ? "Fair" : "Poor",
    },
    "Gas Efficiency": {
      score: Math.max(60, securityScore - 10),
      status:
        securityScore >= 75 ? "Good" : securityScore >= 55 ? "Fair" : "Poor",
    },
    "Best Practices": {
      score: Math.max(50, securityScore - 5),
      status:
        securityScore >= 80 ? "Good" : securityScore >= 65 ? "Fair" : "Poor",
    },
  } as {
    [category: string]: { score: number; status: "Good" | "Fair" | "Poor" };
  };

  return {
    riskMeter: 100 - securityScore,
    securityGrade,
    categories,
  };
};

const simplifyTechnicalTerm = (description: string): string => {
  const simplifications: { [key: string]: string } = {
    reentrancy: "attackers can steal funds by calling functions repeatedly",
    "tx.origin": "vulnerable to phishing attacks",
    "integer overflow": "numbers can wrap around and cause unexpected behavior",
    "access control": "unauthorized users might access restricted functions",
    "timestamp dependency": "relies on block time which can be manipulated",
    "external call": "calls to other contracts that might be malicious",
    selfdestruct: "contract can be permanently destroyed",
  };

  let simplified = description.toLowerCase();
  Object.entries(simplifications).forEach(([term, explanation]) => {
    if (simplified.includes(term)) {
      simplified = explanation;
    }
  });

  return simplified.charAt(0).toUpperCase() + simplified.slice(1);
};

const generateAccessibleMarkdownReport = (
  simplifiedSummary: any,
  developerFriendly: any,
  businessImpact: any,
  visualSummary: any,
  targetAudience: string
): string => {
  return `#  Smart Contract Security Report

##  Quick Summary

**Security Grade: ${visualSummary.securityGrade}** | **Risk Level: ${simplifiedSummary.overallRisk}** | **Score: ${simplifiedSummary.riskScore}/100**

###  What This Means
${simplifiedSummary.actionRequired}

**Estimated Time to Fix:** ${simplifiedSummary.timeToFix}

---

##  Main Concerns

${simplifiedSummary.mainConcerns.map((concern: string, index: number) => `${index + 1}. ${concern}`).join("\n")}

---

##  Business Impact

**Deployment Status:** ${businessImpact.deploymentReadiness === "Ready" ? " Ready" : businessImpact.deploymentReadiness === "Needs Work" ? " Needs Work" : " Not Ready"}

**Risk to Users:** ${businessImpact.riskToUsers}

**Risk to Business:** ${businessImpact.riskToBusiness}

**Estimated Cost to Fix:** ${businessImpact.estimatedCost}

###  Recommended Actions
${businessImpact.recommendedActions.map((action: string, index: number) => `${index + 1}. ${action}`).join("\n")}

---

##  Developer Checklist

### Security Checklist
${developerFriendly.securityChecklist
  .map(
    (item: any) =>
      `- ${item.status === "Pass" ? "✅" : item.status === "Warning" ? "⚠️" : "❌"} **${item.item}**: ${item.explanation}`
  )
  .join("\n")}

###  Code Quality Score: ${developerFriendly.codeQuality.score}/100

**Issues Found:**
${developerFriendly.codeQuality.issues.map((issue: string) => `- ${issue}`).join("\n")}

**Recommended Improvements:**
${developerFriendly.codeQuality.improvements.map((improvement: string) => `- ${improvement}`).join("\n")}

---

##  Category Breakdown

${Object.entries(visualSummary.categories)
  .map(
    ([category, data]: [string, any]) =>
      `**${category}:** ${data.score}/100 (${data.status === "Good" ? "✅" : data.status === "Fair" ? "⚠️" : "❌"} ${data.status})`
  )
  .join("\n")}

---

##  Next Steps

1. **Immediate:** ${simplifiedSummary.overallRisk === "Dangerous" ? "Stop deployment and fix critical issues" : "Review findings and plan fixes"}
2. **Short-term:** Address high-priority security issues
3. **Long-term:** Implement comprehensive testing and monitoring

---

*This report was generated by Smart Contract Auditor Agent. For technical questions, consult with your development team.*`;
};
