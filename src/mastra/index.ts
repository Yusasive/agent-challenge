import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { weatherAgent } from "./agents/weather-agent/weather-agent"; // This can be deleted later
import { weatherWorkflow } from "./agents/weather-agent/weather-workflow"; // This can be deleted later
import { smartContractAuditorAgent } from "./agents/smart-contract-auditor/auditor-agent";
import { requestTimeout } from "./config";

console.log('🚀 Initializing Mastra with Smart Contract Auditor Agent...');

export const mastra = new Mastra({
	workflows: { weatherWorkflow }, // can be deleted later
	agents: { 
		weatherAgent, // can be deleted later
		smartContractAuditorAgent 
	},
	logger: new PinoLogger({
		name: "Mastra",
		level: "info",
	}),
	server: {
		port: 8080,
		timeout: requestTimeout, // Use configurable timeout
		cors: {
			origin: true,
			credentials: true,
		},
	},
});

// Log registered agents for debugging
console.log('📋 Registered agents:', Object.keys(mastra.agents || {}));
console.log('📋 Registered workflows:', Object.keys(mastra.workflows || {}));