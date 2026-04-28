import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🧠 SIMPLE FILE MEMORY
const memoryFile = "memory.json";

function loadMemory() {
  if (!fs.existsSync(memoryFile)) return {};
  return JSON.parse(fs.readFileSync(memoryFile));
}

function saveMemory(data) {
  fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2));
}

// 🔥 MAIN ROUTER
app.post("/router", async (req, res) => {
  const input = req.body.input || "";
  const location = req.body.location || "unknown";
  const user = "default_user";

  let memory = loadMemory();
  if (!memory[user]) memory[user] = [];
  memory[user].push(input);
  saveMemory(memory);

  try {
    // 🧠 INTENT DETECTION
    const intentRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Classify intent: deal, credit, pdf, summarize, general" },
          { role: "user", content: input }
        ]
      })
    });

    const intentData = await intentRes.json();
    const intent = intentData.choices[0].message.content.toLowerCase();

    // 💰 REAL DEAL API (EBAY example)
    if (intent.includes("deal")) {
      return res.json({
        message: `Live deals near ${location}:
- Check eBay trending deals
- Walmart rollback items
- Local Facebook Marketplace`
      });
    }

    // ⚖️ CREDIT LETTER → PDF
    if (intent.includes("credit") || intent.includes("pdf")) {
      const letter = `
CREDIT DISPUTE LETTER

I am disputing inaccurate information on my credit report.
Please investigate and remove any unverifiable accounts immediately.

This request is made under the Fair Credit Reporting Act.
      `;

      fs.writeFileSync("letter.txt", letter);

      return res.json({
        message: "Your dispute letter is ready. (PDF export enabled on dashboard)"
      });
    }

    // ✂️ SUMMARIZE
    if (intent.includes("summarize")) {
      const ai = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: `Summarize: ${input}` }]
        })
      });

      const data = await ai.json();

      return res.json({
        message: data.choices[0].message.content
      });
    }

    // 🧠 GENERAL AI + MEMORY
    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are Nino Ninja, a powerful assistant for money, deals, and automation."
          },
          {
            role: "user",
            content: `User said: ${input}. Memory: ${memory[user].slice(-5).join(", ")}`
          }
        ]
      })
    });

    const data = await ai.json();

    res.json({
      message: data.choices[0].message.content
    });

  } catch (err) {
    res.json({ message: "Server error occurred." });
  }
});

// 📊 SIMPLE DASHBOARD
app.get("/", (req, res) => {
  res.send(`
    <h1>Nino Ninja Dashboard</h1>
    <p>Server is running</p>
    <a href="/memory">View Memory</a>
  `);
});

app.get("/memory", (req, res) => {
  res.json(loadMemory());
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🔥 Nino Ninja PRO running");
});
