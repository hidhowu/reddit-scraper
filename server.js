const express = require("express");
const helmet = require("helmet");
const puppeteer = require("puppeteer-extra");
const CHROME_PATH = process.env.CHROME_PATH || "/usr/bin/chromium-browser";
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 5050;
const LOG_OUTPUT = process.env.LOG_OUTPUT === "true";

app.use(helmet());
app.use(express.json());

let browser;

async function launchBrowser() {
  browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  browser.on("disconnected", () => {
    browser = null;
  });
}

async function getBrowser() {
  if (!browser) await launchBrowser();
  return browser;
}

async function scrapeReddit(keyword) {
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}`;
    const response = await page.goto(url, { waitUntil: "networkidle2" });

    if (!response.ok()) {
      throw new Error(`Reddit returned status ${response.status()}`);
    }

    const json = await page.evaluate(() =>
      JSON.parse(document.querySelector("pre").innerText)
    );

    return json;
  } finally {
    await page.close();
  }
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

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Usage: GET http://localhost:${PORT}/search?q=your+keyword`);
  console.log(`Output logging: ${LOG_OUTPUT ? "ON" : "OFF"} (set LOG_OUTPUT=true to enable)`);
  // Pre-warm the browser
  await getBrowser();
  console.log("Browser ready.");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  if (browser) await browser.close();
  process.exit();
});
