const puppeteer = require("puppeteer");

async function scrapePrice(url) {
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle2" });

    const priceElement = await page.$(".a-price-whole");
    if (!priceElement) return null;

    const priceText = await page.evaluate((el) => el.textContent, priceElement);
    return parseFloat(priceText.replace(/[₹$,]/g, ""));
  } catch {
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapePrice;
