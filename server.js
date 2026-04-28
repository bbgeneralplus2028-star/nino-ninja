import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🔥 SMART ROUTER
app.post("/router", async (req, res) => {
  const input = req.body.input || "";
  const location = req.body.location || "";
  const time = req.body.time || "";

  try {
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
            content: "You are Nino Ninja, a smart voice assistant that helps with money, deals, credit, and daily tasks."
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
      message: data.choices?.[0]?.message?.content || "No response"
    });

  } catch (err) {
    res.json({ message: "Server error" });
  }
});

app.get("/", (req, res) => {
  res.send("Nino Ninja AI is running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🔥 Server running");
});
