import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { weatherAgent } from "./agents/weather-agent/weather-agent"; 
import { weatherWorkflow } from "./agents/weather-agent/weather-workflow"; 
import { smartContractAuditorAgent } from "./agents/smart-contract-auditor/auditor-agent";
import { requestTimeout } from "./config";

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: {
    weatherAgent, 
    smartContractAuditorAgent,
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  server: {
    port: 8080,
    timeout: requestTimeout,
    cors: {
      origin: "*",
      credentials: true,
    },
    middleware: [
      async (c: any, next: () => Promise<void>) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), requestTimeout);

        try {
          await next();
        } catch (error) {
          console.error("Request timeout or error:", error);
          return c.json(
            {
              error: "Request timeout",
              message:
                "The request took too long to process. Please try again with a smaller contract or simpler query.",
            },
            408
          );
        } finally {
          clearTimeout(timeout);
        }
      },

      async (c: any, next: () => Promise<void>) => {
        try {
          await next();
        } catch (error) {
          console.error("Server error:", error);
          return c.json(
            {
              error: "Internal server error",
              message: "An unexpected error occurred. Please try again.",
            },
            500
          );
        }
      },
    ],
  },
});
