// Simple test script to verify chat functionality
// Run with: node test-chat-simple.js

const testChatEndpoint = async () => {
  console.log("🧪 Testing Smart Contract Auditor Chat...\n");

  const baseURL = "http://localhost:8080";
  const endpoint = `${baseURL}/agents/smartContractAuditorAgent/chat`;

  const testMessage = {
    message: "Hello! Can you help me analyze a smart contract?",
  };

  try {
    console.log("Sending test message...");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testMessage),
    });

    console.log(`Response status: ${response.status}`);
    console.log(
      `Response headers:`,
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      return;
    }

    const contentType = response.headers.get("content-type");
    console.log(`Content-Type: ${contentType}`);

    if (
      contentType?.includes("text/plain") ||
      contentType?.includes("text/event-stream")
    ) {
      console.log("📡 Streaming response detected");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let fullResponse = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          fullResponse += chunk;
          process.stdout.write(chunk);
        }
        console.log(
          "\n\n Full response received:",
          fullResponse.length,
          "characters"
        );
      }
    } else {
      const responseText = await response.text();
      console.log("📄 Regular response:", responseText);
    }
  } catch (error) {
    console.error(" Test failed:", error.message);
  }
};

testChatEndpoint();
