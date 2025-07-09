// Quick hosted model diagnostic script
const checkHostedModel = async () => {
  console.log('🔍 Checking hosted model setup...\n');
  
  const baseURL = 'https://5tql5kqqyzbfo6jvsqwtgnumdgh49voayzqx7f2bd7fb.node.k8s.prd.nos.ci/v1';
  const modelName = 'qwen2.5:7b';
  const apiKey = process.env.API_KEY || '';
  
  try {
    // Check if endpoint is accessible
    console.log('1. Checking if hosted endpoint is accessible...');
    const healthResponse = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(10000)
    });
    
    if (!healthResponse.ok) {
      console.log(`⚠️  Endpoint returned ${healthResponse.status}: ${healthResponse.statusText}`);
      console.log('This might be normal if the endpoint doesn\'t support /models');
    } else {
      console.log('✅ Hosted endpoint is accessible');
      
      // Check available models
      try {
        const modelsData = await healthResponse.json();
        const models = modelsData.data || modelsData.models || [];
        
        if (models.length > 0) {
          console.log('\n2. Available models:');
          models.forEach(model => {
            console.log(`  - ${model.id || model.name}`);
          });
          
          // Check if our model exists
          const hasModel = models.some(model => 
            (model.id || model.name) === modelName || 
            (model.id || model.name).includes(modelName.split(':')[0])
          );
          
          if (!hasModel) {
            console.log(`\n⚠️  Model ${modelName} not found in list!`);
            console.log('This might be normal if the model is available but not listed.');
          } else {
            console.log(`✅ Model ${modelName} is available`);
          }
        } else {
          console.log('\n2. No models listed (this might be normal for some endpoints)');
        }
      } catch (parseError) {
        console.log('\n2. Could not parse models response (this might be normal)');
      }
    }
    
    // Test a simple chat request
    console.log('\n3. Testing chat functionality...');
    const chatResponse = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Hello, respond with just "OK"' }],
        max_tokens: 10,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(30000)
    });
    
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text().catch(() => 'Unknown error');
      console.log(`❌ Chat test failed: ${chatResponse.status} - ${errorText}`);
      
      if (chatResponse.status === 401) {
        console.log('\n🔧 Authentication error. You might need to set API_KEY in your .env file');
      } else if (chatResponse.status === 404) {
        console.log('\n🔧 Model not found. Check if the model name is correct');
      }
    } else {
      const chatData = await chatResponse.json();
      console.log('✅ Chat test successful');
      console.log(`Response: ${chatData.choices?.[0]?.message?.content || 'No content'}`);
      
      console.log('\n🎉 Hosted model setup is working correctly!');
    }
    
  } catch (error) {
    console.error('\n❌ Hosted model check failed:', error.message);
    
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.log('\n🔧 Timeout detected. Try these solutions:');
      console.log('1. Check your internet connection');
      console.log('2. The hosted endpoint might be overloaded');
      console.log('3. Try again in a few minutes');
    } else if (error.message.includes('fetch')) {
      console.log('\n🔧 Connection failed. Try these solutions:');
      console.log('1. Check if the endpoint URL is correct');
      console.log('2. Verify your network connection');
      console.log('3. Check if you need an API key');
    }
  }
};

// Run the check
checkHostedModel();