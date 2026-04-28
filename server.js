import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 📁 storage
const DATA_DIR = "./data";
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const memoryFile = path.join(DATA_DIR, "memory.json");

// 🧠 memory helpers
function loadMemory() {
  if (!fs.existsSync(memoryFile)) return {};
  return JSON.parse(fs.readFileSync(memoryFile));
}

function saveMemory(data) {
  fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2));
}

// 📄 generate simple PDF (HTML download)
function createPDF(content) {
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
    // 🧠 intent detection
    const intentRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
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
    const intent = intentData.choices[0].message.content.toLowerCase();

    // 💰 DEALS (ready for API plug-in)
    if (intent.includes("deal")) {
      return res.json({
        message: `Deals near ${location}:
- eBay trending deals
- Walmart rollback
- Facebook Marketplace`
      });
    }

    // ⚖️ CREDIT → PDF DOWNLOAD
    if (intent.includes("credit")) {
      const letter = `
I am disputing inaccurate information on my credit report.
Please investigate and remove any unverifiable accounts.

This request is made under the Fair Credit Reporting Act.
      `;

      const file = createPDF(letter);

      return res.json({
        message: `Your dispute letter is ready. Open dashboard to download.`,
        link: `/download/${file}`
      });
    }

    // 🧠 MEMORY RECALL
    if (input.toLowerCase().includes("what did i say")) {
      return res.json({
        message: memory[user].slice(-5).join(", ")
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

    // 🧠 GENERAL AI
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
            content: "You are Nino Ninja, a powerful AI assistant for money, automation, and life help."
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
      message: data.choices[0].message.content
    });

  } catch (err) {
    res.json({ message: "Server error" });
  }
});

// 📊 DASHBOARD
app.get("/", (req, res) => {
  res.send(`
    <h1>Nino Ninja Dashboard</h1>
    <p>System Active</p>
    <a href="/memory">View Memory</a><br/>
  `);
});

app.get("/memory", (req, res) => {
  res.json(loadMemory());
});

// 📥 DOWNLOAD FILES
app.get("/download/:file", (req, res) => {
  const filePath = path.join(DATA_DIR, req.params.file);
  res.sendFile(path.resolve(filePath));
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🔥 Nino Ninja SaaS running");
});
