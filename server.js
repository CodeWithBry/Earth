// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import mysql from "mysql2";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

const app = express();

// MySQL connection pool
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3000
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "public")));

// Test DB connection
db.getConnection(err => {
  if (err) {
    console.error("❌ DB connection failed:", err);
  } else {
    console.log("✅ Connected to database");
  }
});

// =========================
// FRONTEND ROUTES
// =========================
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/learn", (req, res) => res.sendFile(path.join(__dirname, "public", "news", "news.html")));
app.get("/take-action", (req, res) => res.sendFile(path.join(__dirname, "public", "action", "action.html")));
app.get("/ai-assistant", (req, res) => res.sendFile(path.join(__dirname, "public", "ai", "ai.html")));
app.get("/about", (req, res) => res.sendFile(path.join(__dirname, "public", "about", "about.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login", "login.html")));
app.get("/signup", (req, res) => res.sendFile(path.join(__dirname, "public", "signup", "signup.html")));

// =========================
// API ENDPOINTS
// =========================

// -----------------
// Create new user
// -----------------
app.post("/api/create-user", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.status(201).json({
      message: "User added successfully",
      userId: result.insertId
    });
  });
});

// -----------------
// Get all users
// -----------------
app.post("/api/getUsers", (req, res) => {
  db.query("SELECT * FROM users", (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json(result);
  });
});

// -----------------
// Login / get logged in user
// -----------------
app.post("/api/get-logged-in", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(sql, [email, password], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({ message: "Login successful", user: result[0] });
  });
});

// -----------------
// Chat endpoint (Llama 4 via OpenRouter)
// -----------------
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "Message is required" });

  const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
  if (!OPENROUTER_KEY) return res.status(500).json({ error: "OpenRouter API key not set" });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-maverick",
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter API error:", errText);
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------
// News endpoint (Gemini / RSS fallback)
// -----------------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Gemini helper function
async function callGemini(userQuery, systemPrompt, limit = 10) {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
  const headers = { "Content-Type": "application/json" };
  const timestamp = new Date().toISOString();

  const body = {
    contents: [{ role: "user", parts: [{ text: `${systemPrompt}\nQuery: ${userQuery}` }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 2000, topP: 0.95, topK: 40, responseMimeType: "application/json" }
  };

  const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error(`Gemini API error: ${resp.status}`);

  const data = await resp.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
}

// RSS fallback
async function fetchNewsFromGoogleRSS(query, limit = 10) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const resp = await fetch(rssUrl);
  if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`);

  const xml = await resp.text();
  const results = [];
  const itemRe = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/gi;

  let m;
  while ((m = itemRe.exec(xml)) && results.length < limit) {
    let link = m[2];
    const urlMatch = link.match(/[?&]url=([^&]+)/);
    if (urlMatch) link = decodeURIComponent(urlMatch[1]);
    results.push({ header: m[1].replace(/&amp;/g, '&'), ai_summary: "Summary not available", link });
  }
  return results;
}

app.post("/api/news", async (req, res) => {
  const { userQuery, systemPrompt, limit } = req.body;

  if (!userQuery || !systemPrompt) return res.status(400).json({ error: "Missing fields" });

  const articleLimit = Math.min(10, Math.max(1, parseInt(limit) || 10));

  try {
    let news = [];
    try {
      const aiText = await callGemini(userQuery, systemPrompt, articleLimit);
      news = JSON.parse(aiText);
    } catch (e) {
      console.warn("Gemini failed, using RSS fallback:", e.message);
      news = await fetchNewsFromGoogleRSS(userQuery, articleLimit);
    }

    res.json(news.slice(0, articleLimit));
  } catch (err) {
    console.error("❌ News fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// Start server
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
