// Quick Ollama diagnostic script
const checkOllama = async () => {
  console.log("🔍 Checking Ollama setup...\n");

  const baseURL = "http://127.0.0.1:11500";
  const modelName = "qwen2.5:1.5b";

  try {
    console.log("1. Checking if Ollama is running...");
    const healthResponse = await fetch(`${baseURL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!healthResponse.ok) {
      throw new Error(`Ollama not responding: ${healthResponse.status}`);
    }

    console.log("Ollama is running");

    console.log("\n2. Checking available models...");
    const modelsData = await healthResponse.json();
    const models = modelsData.models || [];

    console.log("Available models:");
    models.forEach((model) => {
      console.log(
        `  - ${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)`
      );
    });

    const hasModel = models.some(
      (model) =>
        model.name === modelName ||
        model.name.startsWith(modelName.split(":")[0])
    );

    if (!hasModel) {
      console.log(`\n Model ${modelName} not found!`);
      console.log(`\n To fix this, run:`);
      console.log(`   ollama pull ${modelName}`);
      return;
    }

    console.log(` Model ${modelName} is available`);

    // Test a simple chat request
    console.log("\n3. Testing chat functionality...");
    const chatResponse = await fetch(`${baseURL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: 'Hello, respond with just "OK"' }],
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!chatResponse.ok) {
      throw new Error(`Chat test failed: ${chatResponse.status}`);
    }

    const chatData = await chatResponse.json();
    console.log(" Chat test successful");
    console.log(`Response: ${chatData.message?.content || "No content"}`);

    console.log("\n Ollama setup is working correctly!");
  } catch (error) {
    console.error("\n Ollama check failed:", error.message);

    if (error.name === "AbortError" || error.message.includes("timeout")) {
      console.log("\n Timeout detected. Try these solutions:");
      console.log("1. Use a smaller model: ollama pull qwen2.5:0.5b");
      console.log("2. Increase system memory");
      console.log("3. Close other applications");
    } else if (error.message.includes("fetch")) {
      console.log("\n Connection failed. Try these solutions:");
      console.log("1. Start Ollama: ollama serve");
      console.log("2. Check if port 11500 is available");
      console.log("3. Restart Ollama service");
    }
  }
};

checkOllama();
