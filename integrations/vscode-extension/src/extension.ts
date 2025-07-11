import * as vscode from 'vscode';
import axios from 'axios';

interface AnalysisResult {
  securityScore: number;
  issues: Array<{
    type: string;
    severity: string;
    line?: number;
    description: string;
    recommendation: string;
  }>;
  summary: string;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Smart Contract Auditor extension is now active!');

  // Register commands
  const analyzeContractCommand = vscode.commands.registerCommand(
    'smartContractAuditor.analyzeContract',
    analyzeContract
  );

  const analyzeCurrentFileCommand = vscode.commands.registerCommand(
    'smartContractAuditor.analyzeCurrentFile',
    analyzeCurrentFile
  );

  const generateReportCommand = vscode.commands.registerCommand(
    'smartContractAuditor.generateReport',
    generateReport
  );

  context.subscriptions.push(
    analyzeContractCommand,
    analyzeCurrentFileCommand,
    generateReportCommand
  );

  // Create output channel
  const outputChannel = vscode.window.createOutputChannel('Smart Contract Auditor');
  context.subscriptions.push(outputChannel);

  // Create diagnostic collection
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('smartContractAuditor');
  context.subscriptions.push(diagnosticCollection);

  // Real-time analysis on file save
  const onSaveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
    if (document.languageId === 'solidity') {
      const config = vscode.workspace.getConfiguration('smartContractAuditor');
      if (config.get('enableRealTimeAnalysis')) {
        await analyzeDocumentAndShowDiagnostics(document, diagnosticCollection, outputChannel);
      }
    }
  });

  context.subscriptions.push(onSaveListener);
}

async function analyzeContract(uri?: vscode.Uri) {
  if (!uri) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No file selected for analysis');
      return;
    }
    uri = editor.document.uri;
  }

  if (!uri.fsPath.endsWith('.sol')) {
    vscode.window.showErrorMessage('Please select a Solidity (.sol) file');
    return;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  await analyzeDocumentAndShowResults(document);
}

async function analyzeCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  if (editor.document.languageId !== 'solidity') {
    vscode.window.showErrorMessage('Current file is not a Solidity contract');
    return;
  }

  await analyzeDocumentAndShowResults(editor.document);
}

async function generateReport() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'solidity') {
    vscode.window.showErrorMessage('Please open a Solidity contract file');
    return;
  }

  try {
    vscode.window.showInformationMessage('Generating comprehensive audit report...');
    
    const config = vscode.workspace.getConfiguration('smartContractAuditor');
    const apiUrl = config.get<string>('apiUrl', 'http://localhost:8080');
    
    const contractCode = editor.document.getText();
    const contractName = getContractName(contractCode) || 'Contract';

    const response = await axios.post(`${apiUrl}/agents/smartContractAuditorAgent/chat`, {
      message: `Generate a comprehensive audit report for this contract named "${contractName}":\n\n${contractCode}`
    }, {
      timeout: 120000 // 2 minutes
    });

    // Create and show report in new document
    const reportDoc = await vscode.workspace.openTextDocument({
      content: response.data,
      language: 'markdown'
    });

    await vscode.window.showTextDocument(reportDoc);
    vscode.window.showInformationMessage('Audit report generated successfully!');

  } catch (error) {
    console.error('Error generating report:', error);
    vscode.window.showErrorMessage(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function analyzeDocumentAndShowResults(document: vscode.TextDocument) {
  try {
    vscode.window.showInformationMessage('Analyzing contract...');
    
    const config = vscode.workspace.getConfiguration('smartContractAuditor');
    const apiUrl = config.get<string>('apiUrl', 'http://localhost:8080');
    const analysisDepth = config.get<string>('analysisDepth', 'intermediate');
    
    const contractCode = document.getText();
    const contractName = getContractName(contractCode);

    const response = await axios.post(`${apiUrl}/agents/smartContractAuditorAgent/chat`, {
      message: `Analyze this smart contract for security vulnerabilities with ${analysisDepth} depth:\n\n${contractCode}`
    }, {
      timeout: 60000 // 1 minute
    });

    // Show results in a new panel
    const panel = vscode.window.createWebviewPanel(
      'contractAnalysis',
      `Analysis: ${contractName || 'Contract'}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true
      }
    );

    panel.webview.html = generateAnalysisWebview(response.data, contractName || 'Contract');
    
    vscode.window.showInformationMessage('Analysis complete! Check the results panel.');

  } catch (error) {
    console.error('Error analyzing contract:', error);
    vscode.window.showErrorMessage(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function analyzeDocumentAndShowDiagnostics(
  document: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection,
  outputChannel: vscode.OutputChannel
) {
  try {
    const config = vscode.workspace.getConfiguration('smartContractAuditor');
    const apiUrl = config.get<string>('apiUrl', 'http://localhost:8080');
    
    const contractCode = document.getText();

    const response = await axios.post(`${apiUrl}/agents/smartContractAuditorAgent/chat`, {
      message: `Quick security analysis for real-time feedback:\n\n${contractCode}`
    }, {
      timeout: 30000 // 30 seconds for real-time
    });

    // Parse response and create diagnostics
    const diagnostics: vscode.Diagnostic[] = [];
    
    // This is a simplified parser - in reality, you'd parse the structured response
    const lines = response.data.split('\n');
    lines.forEach((line: string, index: number) => {
      if (line.includes('vulnerability') || line.includes('issue') || line.includes('warning')) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(index, 0, index, line.length),
          line,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostics.push(diagnostic);
      }
    });

    diagnosticCollection.set(document.uri, diagnostics);
    outputChannel.appendLine(`Analysis complete for ${document.fileName}`);

  } catch (error) {
    outputChannel.appendLine(`Error in real-time analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getContractName(contractCode: string): string | null {
  const match = contractCode.match(/contract\s+(\w+)/);
  return match ? match[1] : null;
}

function generateAnalysisWebview(analysisResult: string, contractName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract Analysis: ${contractName}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                margin: 20px;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .header {
                border-bottom: 2px solid var(--vscode-panel-border);
                padding-bottom: 10px;
                margin-bottom: 20px;
            }
            .analysis-content {
                white-space: pre-wrap;
                font-family: 'Courier New', monospace;
                background-color: var(--vscode-textCodeBlock-background);
                padding: 15px;
                border-radius: 5px;
                border: 1px solid var(--vscode-panel-border);
            }
            .critical { color: #ff6b6b; }
            .high { color: #ffa726; }
            .medium { color: #ffeb3b; }
            .low { color: #4caf50; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🛡️ Security Analysis: ${contractName}</h1>
            <p>Generated by Smart Contract Auditor Agent</p>
        </div>
        <div class="analysis-content">
${analysisResult}
        </div>
    </body>
    </html>
  `;
}

export function deactivate() {}