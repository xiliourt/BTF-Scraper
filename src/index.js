import puppeteer from "@cloudflare/puppeteer";
import htmlContent from './index.html';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Serve the Frontend
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(htmlContent, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // 2. Serve the API
    if (url.pathname === "/api") {
      return handleScrape(request, env);
    }

    return new Response("Not Found", { status: 404 });
  }
};

async function handleScrape(request, env) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('target');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing target parameter" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  let browser;
  try {
    // Launch Cloudflare Browser
    browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();

    // Set a realistic viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Go to the URL
    // waitUntil: 'networkidle0' waits until network traffic stops (page fully loaded)
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait specifically for the price element to appear in the DOM
    const selector = '.search_history-wrapper-item-currency';
    await page.waitForSelector(selector, { timeout: 10000 });

    // Extract the text content
    const price = await page.$eval(selector, el => el.textContent.trim());

    // Extract dates using the previous logic
    const dates = extractDatesFromUrl(targetUrl);

    // Return Data
    return new Response(JSON.stringify({ 
      price: price, 
      currency: "AUD", 
      dates: dates 
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ 
      error: "Scraping failed", 
      details: e.message,
      price: "N/A" 
    }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  } finally {
    // ALWAYS close the browser to free up resources
    if (browser) {
      await browser.close();
    }
  }
}

function extractDatesFromUrl(urlStr) {
  try {
    const parts = urlStr.split('/flights/')[1];
    if (!parts) return { start: "Unknown", end: "Unknown" };
    // Format: MEL0502MAN06031
    const startDay = parts.substring(3, 5);
    const startMonth = parts.substring(5, 7);
    const endDay = parts.substring(10, 12);
    const endMonth = parts.substring(12, 14);
    return { start: `${startDay}/${startMonth}`, end: `${endDay}/${endMonth}` };
  } catch (e) {
    return { start: "Error", end: "Error" };
  }
}
