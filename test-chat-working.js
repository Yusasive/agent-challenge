// Working test script for Smart Contract Auditor Agent
// Run with: node test-chat-working.js

const testSmartContractAuditor = async () => {
  console.log("🧪 Testing Smart Contract Auditor Agent...\n");

  const baseURL = "http://localhost:8080";

  // Test contract for analysis
  const testContract = `
  pragma solidity ^0.7.0;
  
  contract VulnerableContract {
      mapping(address => uint) public balances;
      address public owner;
      
      function withdraw() public {
          uint amount = balances[msg.sender];
          (bool success,) = msg.sender.call{value: amount}("");
          require(success);
          balances[msg.sender] = 0; // Reentrancy vulnerability
      }
      
      function authorize() public {
          require(tx.origin == owner); // tx.origin vulnerability
      }
  }`;

  // Try the correct Mastra API endpoint structure
  const endpoints = [
    "/api/agents/smartContractAuditorAgent/generate",
    "/api/agents/smartContractAuditorAgent/stream",
    "/api/agents/smartContractAuditorAgent/chat",
    "/api/chat",
    "/api/generate",
  ];

  for (const endpoint of endpoints) {
    console.log(`\n🔍 Testing endpoint: ${endpoint}`);

    try {
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: "smartContractAuditorAgent",
          messages: [
            {
              role: "user",
              content: `Please analyze this smart contract for security vulnerabilities:\n\n${testContract}`,
            },
          ],
        }),
      });

      console.log(`Status: ${response.status}`);

      if (response.ok) {
        console.log("✅ Success! Reading response...");

        const contentType = response.headers.get("content-type");
        console.log(`Content-Type: ${contentType}`);

        if (
          contentType?.includes("text/event-stream") ||
          contentType?.includes("text/plain")
        ) {
          // Handle streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            console.log("📡 Streaming response:");
            let fullResponse = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              fullResponse += chunk;
              process.stdout.write(chunk);
            }

            console.log(
              `\n\n✅ Complete response received (${fullResponse.length} chars)`
            );
            return; // Success, exit
          }
        } else {
          // Handle JSON response
          const data = await response.json();
          console.log("📄 JSON Response:", JSON.stringify(data, null, 2));
          return; // Success, exit
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }

  console.log(
    "\n❌ All endpoints failed. Let me check the Mastra documentation structure..."
  );

  // Try alternative message formats
  console.log("\n🔍 Trying alternative message formats...");

  const alternativeFormats = [
    {
      name: "Simple message format",
      body: {
        message: `Analyze this contract: ${testContract}`,
      },
    },
    {
      name: "Agent-specific format",
      body: {
        agent: "smartContractAuditorAgent",
        input: testContract,
      },
    },
    {
      name: "Tool-specific format",
      body: {
        tool: "contractAnalyzerTool",
        input: {
          contractCode: testContract,
        },
      },
    },
  ];

  for (const format of alternativeFormats) {
    console.log(`\n🧪 Testing ${format.name}...`);

    try {
      const response = await fetch(
        `${baseURL}/api/agents/smartContractAuditorAgent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(format.body),
        }
      );

      console.log(`Status: ${response.status}`);

      if (response.ok) {
        const data = await response.text();
        console.log(`✅ Success with ${format.name}!`);
        console.log("Response:", data.substring(0, 200) + "...");
        return;
      }
    } catch (error) {
      console.log(` ${format.name} failed: ${error.message}`);
    }
  }
};

// Run the test
testSmartContractAuditor();
