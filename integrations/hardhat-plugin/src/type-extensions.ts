import "hardhat/types/config";
import "hardhat/types/runtime";

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    smartContractAuditor?: {
      apiUrl?: string;
      analysisDepth?: "basic" | "intermediate" | "deep";
      generateReports?: boolean;
      outputDir?: string;
    };
  }

  interface HardhatConfig {
    smartContractAuditor: {
      apiUrl: string;
      analysisDepth: "basic" | "intermediate" | "deep";
      generateReports: boolean;
      outputDir: string;
    };
  }
}

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    smartContractAuditor: {
      analyzeContract(contractPath: string, options?: any): Promise<string>;
      analyzeAll(options?: any): Promise<any[]>;
      generateReport(contractPath: string, options?: any): Promise<string>;
    };
  }
}