// Script to check available endpoints
// Run with: node check-endpoints.js

const checkEndpoints = async () => {
  console.log("🔍 Checking available endpoints...\n");

  const baseURL = "http://localhost:8080";

  // Check if server is running
  try {
    console.log("1. Testing server health...");
    const healthResponse = await fetch(`${baseURL}/health`);
    console.log(`Health check: ${healthResponse.status}`);

    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log("Health response:", healthData);
    }
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
  }

  // Check API root
  try {
    console.log("\n2. Testing API root...");
    const apiResponse = await fetch(`${baseURL}/api`);
    console.log(`API root: ${apiResponse.status}`);

    if (apiResponse.ok) {
      const apiData = await apiResponse.text();
      console.log("API response:", apiData);
    }
  } catch (error) {
    console.log("❌ API root failed:", error.message);
  }

  // Check agents endpoint
  try {
    console.log("\n3. Testing agents endpoint...");
    const agentsResponse = await fetch(`${baseURL}/api/agents`);
    console.log(`Agents endpoint: ${agentsResponse.status}`);

    if (agentsResponse.ok) {
      const agentsData = await agentsResponse.text();
      console.log("Agents response:", agentsData);
    }
  } catch (error) {
    console.log("❌ Agents endpoint failed:", error.message);
  }

  // Try different possible endpoints
  const possibleEndpoints = [
    "/api/agents/smartContractAuditorAgent",
    "/api/agents/smartContractAuditorAgent/chat",
    "/agents/smartContractAuditorAgent",
    "/agents/smartContractAuditorAgent/chat",
    "/api/chat/smartContractAuditorAgent",
    "/chat/smartContractAuditorAgent",
  ];

  console.log("\n4. Testing possible chat endpoints...");
  for (const endpoint of possibleEndpoints) {
    try {
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: "GET",
      });
      console.log(`${endpoint}: ${response.status}`);

      if (response.status !== 404) {
        const data = await response.text();
        console.log(`  Response: ${data.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`${endpoint}: Error - ${error.message}`);
    }
  }

  // Test POST to different endpoints
  console.log("\n5. Testing POST requests...");
  const testMessage = { message: "test" };

  for (const endpoint of possibleEndpoints) {
    try {
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testMessage),
      });
      console.log(`POST ${endpoint}: ${response.status}`);

      if (response.status !== 404 && response.status !== 405) {
        const data = await response.text();
        console.log(`  Response: ${data.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`POST ${endpoint}: Error - ${error.message}`);
    }
  }
};

checkEndpoints();
