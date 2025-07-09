// Test script for Nosana provided endpoint
// Run with: node test-nosana-endpoint.js

const testNosanaEndpoint = async () => {
  console.log("🧪 Testing Nosana Provided Endpoint...\n");

  const modelName = "qwen2.5:1.5b";
  const apiBaseUrl = "https://dashboard.nosana.com/jobs/GPVMUckqjKR6FwqnxDeDRqbn34BH7gAa5xWnWuNH1drf";

  // Test 1: Basic connectivity
  console.log("1. Testing basic connectivity...");
  try {
    const response = await fetch(apiBaseUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
    });
    console.log(`✅ Connectivity: ${response.status}`);
  } catch (error) {
    console.log(`❌ Connectivity failed: ${error.message}`);
  }

  // Test 2: Chat completion
  console.log("\n2. Testing chat completion...");
  try {
    const chatResponse = await fetch(apiBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "user",
            content: "Hello! Please respond with 'Nosana endpoint working' to confirm connectivity."
          }
        ],
        stream: false,
        max_tokens: 50,
      }),
      signal: AbortSignal.timeout(30000),
    });

    console.log(`Status: ${chatResponse.status}`);
    
    if (chatResponse.ok) {
      const data = await chatResponse.json();
      console.log("✅ Chat response:", data.choices?.[0]?.message?.content || data);
    } else {
      const errorText = await chatResponse.text();
      console.log(`❌ Chat failed: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Chat test failed: ${error.message}`);
  }

  // Test 3: Contract analysis simulation
  console.log("\n3. Testing contract analysis...");
  const testContract = `
    pragma solidity ^0.8.0;
    contract SimpleTest {
        uint256 public value;
        function setValue(uint256 _value) public {
            value = _value;
        }
    }
  `;

  try {
    const analysisResponse = await fetch(apiBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content: "You are a smart contract security auditor. Analyze the provided contract for security issues."
          },
          {
            role: "user",
            content: `Please analyze this smart contract:\n\n${testContract}`
          }
        ],
        stream: false,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(45000),
    });

    console.log(`Analysis status: ${analysisResponse.status}`);
    
    if (analysisResponse.ok) {
      const data = await analysisResponse.json();
      const response = data.choices?.[0]?.message?.content || JSON.stringify(data);
      console.log("✅ Analysis response:", response.substring(0, 200) + "...");
    } else {
      const errorText = await analysisResponse.text();
      console.log(`❌ Analysis failed: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Analysis test failed: ${error.message}`);
  }

  console.log("\n🎯 Test completed!");
  console.log("\nIf all tests pass, your agent should work with the Nosana endpoint.");
  console.log("If tests fail, you may need to:");
  console.log("- Check if the endpoint is still active");
  console.log("- Verify the correct API format");
  console.log("- Adjust timeout settings");
};

testNosanaEndpoint();