import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { weatherAgent } from "./agents/weather-agent/weather-agent"; // This can be deleted later
import { weatherWorkflow } from "./agents/weather-agent/weather-workflow"; // This can be deleted later
import { smartContractAuditorAgent } from "./agents/smart-contract-auditor/auditor-agent";
import { requestTimeout } from "./config";

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
		// Add error handling middleware
		middleware: [
			// Request timeout middleware
			(req: any, res: any, next: any) => {
				req.setTimeout(requestTimeout, () => {
					console.error('Request timeout exceeded');
					if (!res.headersSent) {
						res.status(408).json({
							error: 'Request timeout',
							message: 'The request took too long to process. Please try again with a smaller contract or simpler query.'
						});
					}
				});
				next();
			},
			// Error handling middleware
			(error: any, req: any, res: any, next: any) => {
				console.error('Server error:', error);
				if (!res.headersSent) {
					res.status(500).json({
						error: 'Internal server error',
						message: 'An unexpected error occurred. Please try again.'
					});
				}
			}
		]
	},
});