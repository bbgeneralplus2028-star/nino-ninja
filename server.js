import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

// 🔑 ENV
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// 📁 STORAGE
const DATA_DIR = "./data";
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const memoryFile = path.join(DATA_DIR, "memory.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

// =====================
// 🧠 MEMORY
// =====================
function loadMemory() {
  if (!fs.existsSync(memoryFile)) return {};
  return JSON.parse(fs.readFileSync(memoryFile));
}

function saveMemory(data) {
  fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2));
}

// =====================
// 👤 USERS
// =====================
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// =====================
// 🔐 AUTH (optional for now)
// =====================
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    req.user = "default_user";
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.email;
  } catch {
    req.user = "default_user";
  }

  next();
}

app.use(auth);

// =====================
// 📄 FILE GENERATOR
// =====================
function createHTMLLetter(content) {
  const filename = `letter_${Date.now()}.html`;
  const filepath = path.join(DATA_DIR, filename);

  const html = `
  <html>
    <body>
      <h2>Credit Dispute Letter</h2>
      <pre>${content}</pre>
    </body>
  </html>`;

  fs.writeFileSync(filepath, html);
  return filename;
}

// =====================
// 🧪 TEST ROUTE (GET)
// =====================
app.get("/router", (req, res) => {
  res.send("✅ Router is working. Use POST to interact.");
});

// =====================
// 🔥 MAIN ROUTER (POST)
// =====================
app.post("/router", async (req, res) => {
  const input = req.body.input || "";
  const location = req.body.location || "unknown";
  const user = req.user;

  let memory = loadMemory();
  if (!memory[user]) memory[user] = [];

  if (input.trim()) {
    memory[user].push(input);
    saveMemory(memory);
  }

  try {
    // 🧠 INTENT DETECTION
    const intentRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Classify intent: deal, credit, summarize, memory, general" },
          { role: "user", content: input }
        ]
      })
    });

    const intentData = await intentRes.json();

    const intent =
      intentData?.choices?.[0]?.message?.content?.toLowerCase() || "general";

    // 💰 DEALS
    if (intent.includes("deal")) {
      return res.json({
        message: `Deals near ${location}:
- eBay trending deals
- Walmart rollback deals
- Facebook Marketplace`
      });
    }

    // ⚖️ CREDIT LETTER
    if (intent.includes("credit")) {
      const letter = `
I am disputing inaccurate information on my credit report.
Please investigate and remove any unverifiable accounts.

This request is made under the Fair Credit Reporting Act.
      `;

      const file = createHTMLLetter(letter);

      return res.json({
        message: "Your dispute letter is ready.",
        link: `/download/${file}`
      });
    }

    // 🧠 MEMORY RECALL
    if (input.toLowerCase().includes("what did i say")) {
      return res.json({
        message: memory[user].slice(-5).join(", ") || "No memory yet"
      });
    }

    // ✂️ SUMMARIZE
    if (intent.includes("summarize")) {
      const ai = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: `Summarize: ${input}` }]
        })
      });

      const data = await ai.json();

      return res.json({
        message: data?.choices?.[0]?.message?.content || "No summary"
      });
    }

    // 🧠 GENERAL AI
    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are Nino Ninja, an AI assistant for money, automation, and life help."
          },
          {
            role: "user",
            content: input
          }
        ]
      })
    });

    const data = await ai.json();

    res.json({
      message: data?.choices?.[0]?.message?.content || "No response"
    });

  } catch (err) {
    res.json({ message: "Server error occurred." });
  }
});

// =====================
// 👤 REGISTER
// =====================
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ message: "Missing email or password" });
  }

  const users = loadUsers();

  if (users.find(u => u.email === email)) {
    return res.json({ message: "User already exists" });
  }

  const hash = await bcrypt.hash(password, 10);

  users.push({ email, password: hash });
  saveUsers(users);

  res.json({ message: "User registered" });
});

// =====================
// 🔐 LOGIN
// =====================
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const users = loadUsers();
  const user = users.find(u => u.email === email);

  if (!user) return res.json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ message: "Invalid login" });

  const token = jwt.sign({ email }, JWT_SECRET);

  res.json({ token });
});

// =====================
// 📥 DOWNLOAD
// =====================
app.get("/download/:file", (req, res) => {
  const filePath = path.join(DATA_DIR, req.params.file);
  res.sendFile(path.resolve(filePath));
});

// =====================
// 📊 DASHBOARD
// =====================
app.get("/", (req, res) => {
  res.send(`
    <h1>Nino Ninja AI</h1>
    <p>System Running</p>
    <a href="/memory">View Memory</a>
  `);
});

app.get("/memory", (req, res) => {
  res.json(loadMemory());
});

// =====================
app.listen(process.env.PORT || 3000, () => {
  console.log("🔥 Nino Ninja FULL SYSTEM LIVE");
});
