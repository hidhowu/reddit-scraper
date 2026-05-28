const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );

  const url = "https://www.reddit.com/search.json?q=web%20development";
  await page.goto(url, { waitUntil: "networkidle2" });

  const json = await page.evaluate(() =>
    JSON.parse(document.querySelector("pre").innerText)
  );

  fs.writeFileSync("page-content.json", JSON.stringify(json, null, 2));
  console.log("Saved to page-content.json");

  await browser.close();
})();
