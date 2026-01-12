const fetch = require('node-fetch');

(async () => {
  try {
    const response = await fetch('http://localhost:3001/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuery: "latest world environmental news",
        systemPrompt: "You are an AI news summarizer. Find three recent environmental articles."
      })
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
})();