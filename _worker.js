export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS (Allow your website to talk to this worker)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('target');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "No target param" }), {
        status: 400,
        headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    // 2. Prepare the Scraper
    // We add a User-Agent to look like a real browser
    const scrapeRequest = new Request(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    let extractedData = {
      price: "Not found",
      dates: extractDatesFromUrl(targetUrl) // Get dates from URL string logic
    };

    try {
      const response = await fetch(scrapeRequest);

      // 3. HTMLRewriter: Find the specific span requested
      // <span class="search_history-wrapper-item-currency ...">1426</span>
      const rewriter = new HTMLRewriter()
        .on('.search_history-wrapper-item-currency', {
          text(text) {
            const content = text.text.trim();
            if (content.length > 0) {
              extractedData.price = content;
            }
          }
        });

      await rewriter.transform(response).text();

      // 4. Return JSON
      return new Response(JSON.stringify(extractedData), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" // Important for browser fetch
        }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};

// Helper: Extract Start/End dates purely from the URL structure
// URL Format: .../MEL0502MAN06031 (Origin 3 chars, Date 4 chars, Dest 3 chars, Date 4 chars, Pax 1 char)
function extractDatesFromUrl(urlStr) {
  try {
    const parts = urlStr.split('/flights/')[1]; 
    if (!parts) return { start: "Unknown", end: "Unknown" };

    const startDay = parts.substring(3, 5);
    const startMonth = parts.substring(5, 7);
    
    const endDay = parts.substring(10, 12);
    const endMonth = parts.substring(12, 14);

    return {
      start: `${startDay}/${startMonth}`,
      end: `${endDay}/${endMonth}`
    };
  } catch (e) {
    return { start: "Error", end: "Error" };
  }
}
