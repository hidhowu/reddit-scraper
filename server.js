const express = require("express");
const helmet = require("helmet");
const axios = require("axios");

const app = express();
const PORT = 5050;
const LOG_OUTPUT = "true";

app.use(helmet());
app.use(express.json());

async function scrapeReddit(keyword) {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}`;

  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    },
  });

  return response.data;
}

// GET /search?q=your+keyword
app.get("/search", async (req, res) => {
  const keyword = req.query.q;

  if (!keyword || typeof keyword !== "string" || keyword.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Missing or empty query parameter: q",
    });
  }

  if (keyword.length > 200) {
    return res.status(400).json({
      success: false,
      error: "Query too long (max 200 characters)",
    });
  }

  try {
    const data = await scrapeReddit(keyword.trim());
    if (LOG_OUTPUT) {
      console.log(`\n[Reddit Output] keyword="${keyword.trim()}"`);
      console.log(JSON.stringify(data, null, 2));
    }
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Scrape error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Catch unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Usage: GET http://localhost:${PORT}/search?q=your+keyword`);
  console.log(`Output logging: ${LOG_OUTPUT ? "ON" : "OFF"} (set LOG_OUTPUT=true to enable)`);
});

process.on("SIGINT", () => process.exit());
