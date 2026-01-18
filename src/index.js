// Import the HTML file as a raw string (enabled by wrangler.toml rules)
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
      return handleApiRequest(request);
    }

    // 404 for anything else
    return new Response("Not Found", { status: 404 });
  }
};

// --- API Logic ---
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('target');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing target parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const scrapeRequest = new Request(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    }
  });

  let extractedData = {
    price: "Not found",
    currency: "AUD",
    dates: extractDatesFromUrl(targetUrl)
  };

  try {
    const response = await fetch(scrapeRequest);

    const rewriter = new HTMLRewriter()
      .on('.search_history-wrapper-item-currency', {
        text(text) {
          const content = text.text.trim();
          if (content.length > 0) extractedData.price = content;
        }
      });

    await rewriter.transform(response).text();

    return new Response(JSON.stringify(extractedData), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
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
