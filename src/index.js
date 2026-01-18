export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  
  // Get the target URL from ?target=...
  const targetUrl = url.searchParams.get('target');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing target parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Define headers to mimic a browser (Crucial for flight sites)
  const scrapeRequest = new Request(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  });

  // Default response object
  let extractedData = {
    price: "Not found",
    currency: "AUD",
    dates: extractDatesFromUrl(targetUrl)
  };

  try {
    const response = await fetch(scrapeRequest);

    // Use HTMLRewriter to find the specific element
    const rewriter = new HTMLRewriter()
      .on('.search_history-wrapper-item-currency', {
        text(text) {
          const content = text.text.trim();
          if (content.length > 0) {
            extractedData.price = content;
          }
        }
      });

    // Process the HTML
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

// Helper to extract readable dates from the URL string
function extractDatesFromUrl(urlStr) {
  try {
    const parts = urlStr.split('/flights/')[1]; 
    if (!parts) return { start: "Unknown", end: "Unknown" };

    // Assuming standard format: MEL0502MAN06031
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
