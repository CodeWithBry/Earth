// Simple test client to POST to /api/news
const fetch = globalThis.fetch || require('node-fetch');

(async () => {
  try {
    const res = await fetch('http://localhost:3001/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuery: 'latest world environmental news and climate change updates',
        systemPrompt: `You are an AI news summarizer and editor specializing in environmental topics. Find the three most recent and relevant articles.`
      })
    });

    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('RAW RESPONSE:', text);
    try {
      const json = JSON.parse(text);
      console.log('PARSED JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.error('Failed to parse response as JSON:', e.message);
    }
  } catch (err) {
    console.error('Request failed:', err.message);
  }
})();