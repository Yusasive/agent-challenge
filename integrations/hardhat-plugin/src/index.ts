import { extendConfig, extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { HardhatConfig, HardhatUserConfig } from "hardhat/types";
import axios from 'axios';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

import "./type-extensions";

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    const defaultConfig = {
      apiUrl: "http://localhost:8080",
      analysisDepth: "intermediate",
      generateReports: true,
      outputDir: "./audit-reports"
    };

    config.smartContractAuditor = { ...defaultConfig, ...userConfig.smartContractAuditor };
  }
);

extendEnvironment((hre) => {
  hre.smartContractAuditor = lazyObject(() => {
    return {
      analyzeContract: async (contractPath: string, options?: any) => {
        return analyzeContract(hre, contractPath, options);
      },
      analyzeAll: async (options?: any) => {
        return analyzeAllContracts(hre, options);
      },
      generateReport: async (contractPath: string, options?: any) => {
        return generateAuditReport(hre, contractPath, options);
      }
    };
  });
});

// Tasks
task("audit", "Analyze smart contracts for security vulnerabilities")
  .addOptionalParam("contract", "Specific contract to analyze")
  .addOptionalParam("depth", "Analysis depth (basic, intermediate, deep)")
  .addFlag("report", "Generate detailed audit report")
  .setAction(async (taskArgs, hre) => {
    console.log(chalk.blue("🛡️  Smart Contract Auditor"));
    console.log(chalk.gray("Analyzing contracts for security vulnerabilities...\n"));

    try {
      if (taskArgs.contract) {
        await hre.smartContractAuditor.analyzeContract(taskArgs.contract, {
          depth: taskArgs.depth,
          generateReport: taskArgs.report
        });
      } else {
        await hre.smartContractAuditor.analyzeAll({
          depth: taskArgs.depth,
          generateReport: taskArgs.report
        });
      }
    } catch (error) {
      console.error(chalk.red("❌ Audit failed:"), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

task("audit:report", "Generate comprehensive audit report")
  .addOptionalParam("contract", "Specific contract to analyze")
  .addOptionalParam("output", "Output directory for reports")
  .setAction(async (taskArgs, hre) => {
    console.log(chalk.blue("📊 Generating Audit Reports"));

    try {
      if (taskArgs.contract) {
        await hre.smartContractAuditor.generateReport(taskArgs.contract, {
          outputDir: taskArgs.output
        });
      } else {
        await hre.smartContractAuditor.analyzeAll({
          generateReport: true,
          outputDir: taskArgs.output
        });
      }
    } catch (error) {
      console.error(chalk.red("❌ Report generation failed:"), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Implementation functions
async function analyzeContract(hre: any, contractPath: string, options: any = {}) {
  const config = hre.config.smartContractAuditor;
  const fullPath = path.resolve(hre.config.paths.sources, contractPath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Contract not found: ${fullPath}`);
  }

  const contractCode = fs.readFileSync(fullPath, 'utf8');
  const contractName = path.basename(contractPath, '.sol');

  console.log(chalk.yellow(`🔍 Analyzing: ${contractName}`));

  try {
    const response = await axios.post(`${config.apiUrl}/agents/smartContractAuditorAgent/chat`, {
      message: `Analyze this smart contract with ${options.depth || config.analysisDepth} depth:\n\n${contractCode}`
    }, {
      timeout: 120000 // 2 minutes
    });

    // Parse and display results
    displayAnalysisResults(contractName, response.data);

    // Generate report if requested
    if (options.generateReport || config.generateReports) {
      await saveAuditReport(contractName, response.data, options.outputDir || config.outputDir);
    }

    return response.data;

  } catch (error) {
    throw new Error(`Analysis failed for ${contractName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function analyzeAllContracts(hre: any, options: any = {}) {
  const contractsDir = hre.config.paths.sources;
  const contractFiles = getAllSolidityFiles(contractsDir);

  console.log(chalk.blue(`Found ${contractFiles.length} contract(s) to analyze\n`));

  const results = [];
  for (const contractFile of contractFiles) {
    try {
      const result = await analyzeContract(hre, contractFile, options);
      results.push({ contract: contractFile, result });
    } catch (error) {
      console.error(chalk.red(`❌ Failed to analyze ${contractFile}:`), error instanceof Error ? error.message : error);
      results.push({ contract: contractFile, error });
    }
  }

  // Summary
  const successful = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;

  console.log(chalk.green(`\n✅ Analysis complete: ${successful} successful, ${failed} failed`));

  return results;
}

async function generateAuditReport(hre: any, contractPath: string, options: any = {}) {
  const config = hre.config.smartContractAuditor;
  const fullPath = path.resolve(hre.config.paths.sources, contractPath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Contract not found: ${fullPath}`);
  }

  const contractCode = fs.readFileSync(fullPath, 'utf8');
  const contractName = path.basename(contractPath, '.sol');

  console.log(chalk.yellow(`📊 Generating comprehensive report for: ${contractName}`));

  try {
    const response = await axios.post(`${config.apiUrl}/agents/smartContractAuditorAgent/chat`, {
      message: `Generate a comprehensive professional audit report for this contract named "${contractName}":\n\n${contractCode}`
    }, {
      timeout: 180000 // 3 minutes for comprehensive report
    });

    await saveAuditReport(contractName, response.data, options.outputDir || config.outputDir);
    console.log(chalk.green(`✅ Report generated for ${contractName}`));

    return response.data;

  } catch (error) {
    throw new Error(`Report generation failed for ${contractName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function displayAnalysisResults(contractName: string, analysisResult: string) {
  console.log(chalk.cyan(`\n📋 Analysis Results for ${contractName}:`));
  console.log(chalk.gray("─".repeat(50)));
  
  // Simple parsing for display (in reality, you'd parse structured JSON)
  const lines = analysisResult.split('\n');
  lines.forEach(line => {
    if (line.includes('Critical')) {
      console.log(chalk.red(`🚨 ${line}`));
    } else if (line.includes('High')) {
      console.log(chalk.yellow(`⚠️  ${line}`));
    } else if (line.includes('Medium')) {
      console.log(chalk.blue(`ℹ️  ${line}`));
    } else if (line.includes('Low')) {
      console.log(chalk.green(`✓ ${line}`));
    } else if (line.trim()) {
      console.log(chalk.gray(line));
    }
  });
  
  console.log(chalk.gray("─".repeat(50)));
}

async function saveAuditReport(contractName: string, reportContent: string, outputDir: string) {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${contractName}-audit-${timestamp}.md`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, reportContent, 'utf8');
  console.log(chalk.green(`📄 Report saved: ${filepath}`));
}

function getAllSolidityFiles(dir: string): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string, relativePath: string = '') {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const relativeItemPath = path.join(relativePath, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        traverse(fullPath, relativeItemPath);
      } else if (item.endsWith('.sol')) {
        files.push(relativeItemPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}