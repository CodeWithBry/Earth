// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import mysql from "mysql2"
import { fileURLToPath } from "url";

const app = express();
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(
  import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

app.use(express.static(path.join(__dirname, "public")));

// FRONTEND ROUTES:

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})
app.get("/learn", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "/news", "/news.html"))
})
app.get("/take-action", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "action", "action.html"))
})
app.get("/ai-assistant", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "ai", "ai.html"))
})
app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "about", "about.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login", "login.html"));
});
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup", "signup.html"));
});


// API ENDPOINTS AND FUNCTIONS


db.getConnection(err => { //test connection
  if (err) {
    console.log("THERE IS NO CONNECTION!", err);
    return;
  }
  console.log("CONNECTED TO ACCOUNT'S DATABASE!")
});

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log("Sending message to Llama 4 Maverick:", userMessage);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-maverick",
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await response.json();
    console.log("Llama 4 Response:", data);

    if (data.error) {
      console.error("API Error:", data.error);
      return res.status(response.status || 500).json(data);
    }

    res.json(data);

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message });
  }
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper: call the Gemini API endpoint
async function callGemini(userQuery, systemPrompt, limit = 10) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
  const headers = { 'Content-Type': 'application/json' };

  // Define the required output structure for the model
  const responseSchema = {
    type: "ARRAY",
    description: "A list of news articles, each summarized by the AI.",
    items: {
      type: "OBJECT",
      properties: {
        "header": { "type": "STRING", "description": "The title of the news article." },
        "ai_summary": { "type": "STRING", "description": "A 1-2 sentence AI-generated summary of the article's key points." },
        "link": { "type": "STRING", "description": "The URL link to the original news article." }
      },
      required: ["header", "ai_summary", "link"]
    }
  };

  // Add timestamp to make queries unique and get fresh results
  const timestamp = new Date().toISOString();

  // Combine system prompt with user query for better results
  const fullUserPrompt = `${systemPrompt}
Current time: ${timestamp}. Search for ${limit} DIFFERENT recent environmental news articles from the past 7 days about: ${userQuery}.

CRITICAL REQUIREMENTS:
- First of all, i need you to look for online articles that are RECENT and PUBLISHED WITHIN THE LAST 7 DAYS. It will be your first priority to look for recent articles first because your summary and article header SHOULD BE SEEN IN THE LINKS THAT YOU WILL PROVIDE. MAKE SURE: THAT THE URL ARE NOT MISTYPED, THE ARTICLES OR DIDNT MOVED OR DELETED, THE LINKS ARE NOT BROKEN OR DELETED, AND THERE'S NO DNS ISSUES OR SERVER MISCONFIGURATION. I NEED YOU TO: REQUEST CURRENT INFORMATION, SPECIFY OFFICIAL SOURCES, ASK FOR VERIFICATION STRATEGY, PROVIDE CONTEXT FOR DYNAMIC CONTENT, REFINE URL STRUCTURE MANUALLY, AND USE AI FOR TROUBLESHOOTING.
- Find articles from DIFFERENT reputable news sources (BBC, Reuters, CNN, The Guardian, AP News, etc.)
- Include articles from the LAST WEEK only (published after ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]})
- Each article must be UNIQUE with a different headline
- Prioritize variety in topics and sources
- **IMPORTANT: Provide the DIRECT, WORKING URL to each article (you may use Google News redirect links). It must not only work but also contain the articles and be able to see the ai summary to it**
- URLs must start with http:// or https://
- Verify the URLs are accessible and not behind paywalls if possible
- Return ONLY a valid JSON array matching the provided schema
- The links to the articles must be real and was able to be searched online and accessed (must not return 404 or error because some of the links might be broken or invalid). So double check the links before returning them.
- List atleast 3 different sources links for the articles you found.

note: after checking your links, if some links are broken or invalid, replace them with other valid articles. don't return broken or invalid links.

note: check the website first, and if it return an error or not found, dont send that link. instead, find another article with a valid link.

You are a news aggregator that MUST provide diverse, recent articles from different sources with VALID, WORKING URLs. Never repeat the same article or source. Always verify articles are recent and links work.`;

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: fullUserPrompt }]
    }],
    generationConfig: {
      temperature: 0.8, // Increased for more variety
      maxOutputTokens: 2000,
      topP: 0.95,
      topK: 40,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
    tools: [{
      googleSearch: {}
    }]
  };

  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`Gemini API error: ${resp.status} - ${text}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();

  if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.error('Unexpected Gemini response format:', JSON.stringify(data, null, 2));
    throw new Error('Invalid response format from Gemini');
  }

  return data.candidates[0].content.parts[0].text;
}

// Fallback: fetch news items from Google News RSS for the query
async function fetchNewsFromGoogleRSS(query, limit = 10) {
  try {
    const rssUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=en-US&gl=US&ceid=US:en';
    const resp = await fetch(rssUrl);

    if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`);

    const xml = await resp.text();
    const itemRe = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?(?:<description>([\s\S]*?)<\/description>)?/gi;
    const results = [];
    let m;

    while ((m = itemRe.exec(xml)) && results.length < limit) {
      let title = m[1] || '';
      let rawLink = m[2] || '';
      let desc = m[3] || '';

      // Google News RSS links are redirect URLs - extract the actual article URL
      let link = rawLink;
      try {
        // Google News RSS format: https://news.google.com/rss/articles/...?url=ACTUAL_URL
        const urlMatch = rawLink.match(/[?&]url=([^&]+)/);
        if (urlMatch) {
          link = decodeURIComponent(urlMatch[1]);
        }
      } catch (e) {
        console.error('Failed to parse redirect URL:', e);
      }

      desc = desc.replace(/<[^>]+>/g, '');
      title = title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      desc = desc.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      results.push({
        header: title.trim(),
        ai_summary: desc.trim().slice(0, 280) || 'Click to read the full article.',
        link: link.trim()
      });
    }

    return results;
  } catch (e) {
    console.error('RSS fallback failed:', e);
    return null;
  }
}

app.post('/api/news', async (req, res) => {
  try {
    const { userQuery, systemPrompt } = req.body;

    if (!userQuery || !systemPrompt) {
      return res.status(400).json([{
        header: "Error",
        ai_summary: "Missing required fields: userQuery and systemPrompt",
        link: "#"
      }]);
    }

    const requestedLimit = parseInt(req.body.limit, 10) || 10;
    const limit = Math.min(10, Math.max(1, requestedLimit));

    console.log(`\n🔍 Searching for: "${userQuery}"`);
    console.log(`📊 Requested ${limit} articles`);

    let aiText = null;
    try {
      aiText = await callGemini(userQuery, systemPrompt, limit);
      console.log('✅ Gemini API response received');
    } catch (err) {
      console.error('❌ Gemini API failed, trying RSS fallback...', err.message);
      const rss = await fetchNewsFromGoogleRSS(userQuery, limit);

      if (rss && Array.isArray(rss) && rss.length > 0) {
        console.log(`✅ RSS fallback returned ${rss.length} articles`);
        return res.json(rss);
      }

      return res.status(500).json([{
        header: "Error Fetching News",
        ai_summary: `Unable to fetch news articles. API error: ${err.message}`,
        link: "#"
      }]);
    }

    let parsedNews = null;
    try {
      parsedNews = JSON.parse(aiText);

      if (!Array.isArray(parsedNews) || parsedNews.length === 0) {
        throw new Error('No valid articles array found');
      }

      // Validate and filter articles
      parsedNews = parsedNews.filter(article =>
        article &&
        typeof article.header === 'string' &&
        typeof article.ai_summary === 'string' &&
        typeof article.link === 'string' &&
        article.header.trim() !== '' &&
        article.ai_summary.trim() !== '' &&
        article.link.trim() !== '' &&
        article.link !== '#' &&
        (article.link.startsWith('http://') || article.link.startsWith('https://'))
      );

      // Remove duplicates based on title similarity
      const seenTitles = new Set();
      parsedNews = parsedNews.filter(article => {
        const normalizedTitle = article.header.toLowerCase().trim();
        if (seenTitles.has(normalizedTitle)) {
          return false;
        }
        seenTitles.add(normalizedTitle);
        return true;
      });

      if (parsedNews.length === 0) {
        throw new Error('No valid articles after filtering');
      }

      console.log(`✅ Returning ${parsedNews.length} unique articles from Gemini`);
    } catch (e) {
      console.error('❌ Failed to parse Gemini response:', e.message);
      console.log('🔄 Trying RSS fallback...');

      const rss = await fetchNewsFromGoogleRSS(userQuery, limit);

      if (rss && Array.isArray(rss) && rss.length > 0) {
        console.log(`✅ RSS fallback returned ${rss.length} articles`);
        return res.json(rss);
      }

      return res.status(500).json([{
        header: 'Error Processing News',
        ai_summary: 'Could not get valid news articles. Please try again.',
        link: '#'
      }]);
    }

    if (parsedNews.length > limit) parsedNews = parsedNews.slice(0, limit);

    return res.json(parsedNews);
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/getUsers", (req, res) => {
  db.query("SELECT * FROM users", (err, result) => {
    if (err) return;

    res.status(500).json(err);
    res.json(result);
  })
})

app.post("/api/createUser", (req, res) => {
  const { email, password } = req.body;
  db.query(`INSERT INTO users VALUES (id, email, password) VALUES(?, ?, ?);`, [1, email, password], (err, result) => {
    if (err) return;

    console.log(result)
    res.json(result);
  })
})

// POST create new user
app.post("/api/create-user", (req, res) => {
  const { email, password } = req.body;

  const sql = "INSERT INTO users (email, password) VALUES (?, ?)";

  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.status(201).json({
      message: "User added successfully",
      userId: result.insertId
    });
  });
});

app.post("/api/get-logged-in", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({
      result,
      message: "User added successfully",
      userId: result.insertId
    });
  });
});

app.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
  console.log("🤖 Using Meta Llama 4 Maverick model");
});