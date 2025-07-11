#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import axios from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

const program = new Command();

interface Config {
  apiUrl: string;
  analysisDepth: 'basic' | 'intermediate' | 'deep';
  outputDir: string;
  autoSave: boolean;
}

const defaultConfig: Config = {
  apiUrl: 'http://localhost:8080',
  analysisDepth: 'intermediate',
  outputDir: './audit-reports',
  autoSave: true
};

program
  .name('smart-contract-auditor')
  .description('AI-powered smart contract security analysis')
  .version('1.0.0');

// Analyze command
program
  .command('analyze')
  .description('Analyze a smart contract for security vulnerabilities')
  .argument('<file>', 'Path to the Solidity contract file')
  .option('-d, --depth <level>', 'Analysis depth (basic, intermediate, deep)', 'intermediate')
  .option('-o, --output <dir>', 'Output directory for reports')
  .option('-r, --report', 'Generate detailed audit report')
  .option('--api-url <url>', 'API URL for the auditor agent')
  .action(async (file, options) => {
    await analyzeContract(file, options);
  });

// Batch analyze command
program
  .command('batch')
  .description('Analyze multiple contracts in a directory')
  .argument('<directory>', 'Directory containing Solidity contracts')
  .option('-d, --depth <level>', 'Analysis depth (basic, intermediate, deep)', 'intermediate')
  .option('-o, --output <dir>', 'Output directory for reports')
  .option('-r, --report', 'Generate detailed audit reports')
  .option('--api-url <url>', 'API URL for the auditor agent')
  .action(async (directory, options) => {
    await batchAnalyze(directory, options);
  });

// Report command
program
  .command('report')
  .description('Generate a comprehensive audit report')
  .argument('<file>', 'Path to the Solidity contract file')
  .option('-o, --output <dir>', 'Output directory for the report')
  .option('--api-url <url>', 'API URL for the auditor agent')
  .action(async (file, options) => {
    await generateReport(file, options);
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive analysis mode')
  .action(async () => {
    await interactiveMode();
  });

// Config command
program
  .command('config')
  .description('Configure the CLI tool')
  .action(async () => {
    await configureSettings();
  });

// Health check command
program
  .command('health')
  .description('Check connection to the auditor agent')
  .option('--api-url <url>', 'API URL to check')
  .action(async (options) => {
    await healthCheck(options);
  });

async function analyzeContract(filePath: string, options: any) {
  const spinner = ora('Analyzing contract...').start();
  
  try {
    const config = await loadConfig();
    const apiUrl = options.apiUrl || config.apiUrl;
    const depth = options.depth || config.analysisDepth;
    
    if (!await fs.pathExists(filePath)) {
      spinner.fail(`File not found: ${filePath}`);
      return;
    }

    const contractCode = await fs.readFile(filePath, 'utf8');
    const contractName = path.basename(filePath, '.sol');

    spinner.text = `Analyzing ${contractName} with ${depth} depth...`;

    const response = await axios.post(`${apiUrl}/agents/smartContractAuditorAgent/chat`, {
      message: `Analyze this smart contract with ${depth} depth:\n\n${contractCode}`
    }, {
      timeout: 120000
    });

    spinner.succeed(`Analysis complete for ${contractName}`);

    // Display results
    console.log(chalk.cyan('\n📋 Analysis Results:'));
    console.log(chalk.gray('─'.repeat(60)));
    displayFormattedResults(response.data);

    // Save report if requested
    if (options.report || config.autoSave) {
      const outputDir = options.output || config.outputDir;
      await saveReport(contractName, response.data, outputDir, 'analysis');
    }

  } catch (error) {
    spinner.fail('Analysis failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function batchAnalyze(directory: string, options: any) {
  const spinner = ora('Finding contracts...').start();
  
  try {
    const config = await loadConfig();
    const apiUrl = options.apiUrl || config.apiUrl;
    const depth = options.depth || config.analysisDepth;

    if (!await fs.pathExists(directory)) {
      spinner.fail(`Directory not found: ${directory}`);
      return;
    }

    const contractFiles = await glob('**/*.sol', { cwd: directory });
    
    if (contractFiles.length === 0) {
      spinner.fail('No Solidity contracts found in directory');
      return;
    }

    spinner.succeed(`Found ${contractFiles.length} contract(s)`);

    const results = [];
    for (let i = 0; i < contractFiles.length; i++) {
      const file = contractFiles[i];
      const fullPath = path.join(directory, file);
      
      const analyzeSpinner = ora(`[${i + 1}/${contractFiles.length}] Analyzing ${file}...`).start();
      
      try {
        const contractCode = await fs.readFile(fullPath, 'utf8');
        const contractName = path.basename(file, '.sol');

        const response = await axios.post(`${apiUrl}/agents/smartContractAuditorAgent/chat`, {
          message: `Analyze this smart contract with ${depth} depth:\n\n${contractCode}`
        }, {
          timeout: 120000
        });

        analyzeSpinner.succeed(`✅ ${file}`);
        results.push({ file, success: true, result: response.data });

        // Save individual reports if requested
        if (options.report || config.autoSave) {
          const outputDir = options.output || config.outputDir;
          await saveReport(contractName, response.data, outputDir, 'analysis');
        }

      } catch (error) {
        analyzeSpinner.fail(`❌ ${file}`);
        results.push({ file, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(chalk.green(`\n🎉 Batch analysis complete:`));
    console.log(chalk.green(`  ✅ Successful: ${successful}`));
    if (failed > 0) {
      console.log(chalk.red(`  ❌ Failed: ${failed}`));
    }

  } catch (error) {
    spinner.fail('Batch analysis failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function generateReport(filePath: string, options: any) {
  const spinner = ora('Generating comprehensive report...').start();
  
  try {
    const config = await loadConfig();
    const apiUrl = options.apiUrl || config.apiUrl;
    
    if (!await fs.pathExists(filePath)) {
      spinner.fail(`File not found: ${filePath}`);
      return;
    }

    const contractCode = await fs.readFile(filePath, 'utf8');
    const contractName = path.basename(filePath, '.sol');

    const response = await axios.post(`${apiUrl}/agents/smartContractAuditorAgent/chat`, {
      message: `Generate a comprehensive professional audit report for this contract named "${contractName}":\n\n${contractCode}`
    }, {
      timeout: 180000 // 3 minutes for comprehensive report
    });

    spinner.succeed(`Report generated for ${contractName}`);

    const outputDir = options.output || config.outputDir;
    await saveReport(contractName, response.data, outputDir, 'report');

  } catch (error) {
    spinner.fail('Report generation failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function interactiveMode() {
  console.log(chalk.blue('🛡️  Smart Contract Auditor - Interactive Mode'));
  console.log(chalk.gray('Choose an option to get started:\n'));

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔍 Analyze a single contract', value: 'analyze' },
          { name: '📁 Batch analyze directory', value: 'batch' },
          { name: '📊 Generate detailed report', value: 'report' },
          { name: '⚙️  Configure settings', value: 'config' },
          { name: '🏥 Health check', value: 'health' },
          { name: '🚪 Exit', value: 'exit' }
        ]
      }
    ]);

    if (action === 'exit') {
      console.log(chalk.green('👋 Goodbye!'));
      break;
    }

    try {
      switch (action) {
        case 'analyze':
          await interactiveAnalyze();
          break;
        case 'batch':
          await interactiveBatch();
          break;
        case 'report':
          await interactiveReport();
          break;
        case 'config':
          await configureSettings();
          break;
        case 'health':
          await healthCheck({});
          break;
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    }

    console.log(); // Add spacing
  }
}

async function interactiveAnalyze() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'filePath',
      message: 'Enter the path to your Solidity contract:',
      validate: async (input) => {
        if (!input) return 'Please enter a file path';
        if (!await fs.pathExists(input)) return 'File not found';
        if (!input.endsWith('.sol')) return 'Please select a .sol file';
        return true;
      }
    },
    {
      type: 'list',
      name: 'depth',
      message: 'Select analysis depth:',
      choices: [
        { name: 'Basic (fast)', value: 'basic' },
        { name: 'Intermediate (recommended)', value: 'intermediate' },
        { name: 'Deep (thorough)', value: 'deep' }
      ]
    },
    {
      type: 'confirm',
      name: 'generateReport',
      message: 'Generate detailed report?',
      default: true
    }
  ]);

  await analyzeContract(answers.filePath, answers);
}

async function interactiveBatch() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'directory',
      message: 'Enter the directory path containing contracts:',
      validate: async (input) => {
        if (!input) return 'Please enter a directory path';
        if (!await fs.pathExists(input)) return 'Directory not found';
        return true;
      }
    },
    {
      type: 'list',
      name: 'depth',
      message: 'Select analysis depth:',
      choices: [
        { name: 'Basic (fast)', value: 'basic' },
        { name: 'Intermediate (recommended)', value: 'intermediate' },
        { name: 'Deep (thorough)', value: 'deep' }
      ]
    },
    {
      type: 'confirm',
      name: 'report',
      message: 'Generate detailed reports for each contract?',
      default: true
    }
  ]);

  await batchAnalyze(answers.directory, answers);
}

async function interactiveReport() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'filePath',
      message: 'Enter the path to your Solidity contract:',
      validate: async (input) => {
        if (!input) return 'Please enter a file path';
        if (!await fs.pathExists(input)) return 'File not found';
        if (!input.endsWith('.sol')) return 'Please select a .sol file';
        return true;
      }
    }
  ]);

  await generateReport(answers.filePath, {});
}

async function configureSettings() {
  const config = await loadConfig();
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiUrl',
      message: 'API URL:',
      default: config.apiUrl
    },
    {
      type: 'list',
      name: 'analysisDepth',
      message: 'Default analysis depth:',
      choices: ['basic', 'intermediate', 'deep'],
      default: config.analysisDepth
    },
    {
      type: 'input',
      name: 'outputDir',
      message: 'Output directory for reports:',
      default: config.outputDir
    },
    {
      type: 'confirm',
      name: 'autoSave',
      message: 'Auto-save reports?',
      default: config.autoSave
    }
  ]);

  await saveConfig(answers);
  console.log(chalk.green('✅ Configuration saved!'));
}

async function healthCheck(options: any) {
  const spinner = ora('Checking connection...').start();
  
  try {
    const config = await loadConfig();
    const apiUrl = options.apiUrl || config.apiUrl;

    const response = await axios.get(`${apiUrl}/health`, { timeout: 10000 });
    
    if (response.status === 200) {
      spinner.succeed('✅ Connection successful');
      console.log(chalk.green(`API URL: ${apiUrl}`));
      console.log(chalk.green(`Status: ${response.data.status || 'OK'}`));
    } else {
      spinner.fail('❌ Connection failed');
    }

  } catch (error) {
    spinner.fail('❌ Connection failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  }
}

async function loadConfig(): Promise<Config> {
  const configPath = path.join(process.cwd(), '.sca-config.json');
  
  try {
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      return { ...defaultConfig, ...config };
    }
  } catch (error) {
    // Ignore errors, use default config
  }
  
  return defaultConfig;
}

async function saveConfig(config: Partial<Config>) {
  const configPath = path.join(process.cwd(), '.sca-config.json');
  const currentConfig = await loadConfig();
  const newConfig = { ...currentConfig, ...config };
  
  await fs.writeJson(configPath, newConfig, { spaces: 2 });
}

async function saveReport(contractName: string, content: string, outputDir: string, type: 'analysis' | 'report') {
  await fs.ensureDir(outputDir);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${contractName}-${type}-${timestamp}.md`;
  const filepath = path.join(outputDir, filename);
  
  await fs.writeFile(filepath, content, 'utf8');
  console.log(chalk.green(`📄 ${type === 'report' ? 'Report' : 'Analysis'} saved: ${filepath}`));
}

function displayFormattedResults(result: string) {
  const lines = result.split('\n');
  
  lines.forEach(line => {
    if (line.includes('Critical') || line.includes('🚨')) {
      console.log(chalk.red(line));
    } else if (line.includes('High') || line.includes('⚠️')) {
      console.log(chalk.yellow(line));
    } else if (line.includes('Medium') || line.includes('ℹ️')) {
      console.log(chalk.blue(line));
    } else if (line.includes('Low') || line.includes('✓')) {
      console.log(chalk.green(line));
    } else if (line.trim()) {
      console.log(chalk.gray(line));
    }
  });
}

// Parse command line arguments
program.parse();

export { analyzeContract, batchAnalyze, generateReport };