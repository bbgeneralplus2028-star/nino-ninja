import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🧠 Simple memory (per user)
const memory = {};

// 🔑 ENV
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🔥 MAIN ROUTER
app.post("/router", async (req, res) => {
  const input = req.body.input || "";
  const location = req.body.location || "";
  const user = "default_user";

  // 🧠 MEMORY INIT
  if (!memory[user]) memory[user] = [];
  memory[user].push(input);

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
          { role: "system", content: "Classify intent: deal, credit, summarize, general" },
          { role: "user", content: input }
        ]
      })
    });

    const intentData = await intentRes.json();
    const intent = intentData.choices[0].message.content.toLowerCase();

    // 💰 DEAL FINDER
    if (intent.includes("deal")) {
      return res.json({
        message: `Top deals near you (${location}):
1. Facebook Marketplace deals
2. Craigslist local deals
3. Groupon discounts`
      });
    }

    // ⚖️ CREDIT DISPUTE GENERATOR
    if (intent.includes("credit")) {
      return res.json({
        message:
`Here is a credit dispute letter:

I am disputing an inaccurate account on my credit report.
Please investigate and remove any unverifiable information immediately.

This is my legal request under the Fair Credit Reporting Act.`
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
            content: "You are Nino Ninja, a smart assistant for money, deals, and life help."
          },
          {
            role: "user",
            content: `User said: ${input}. Previous context: ${memory[user].slice(-5).join(", ")}`
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

app.listen(process.env.PORT || 3000, () => {
  console.log("🔥 Nino Ninja FULL system running");
});
