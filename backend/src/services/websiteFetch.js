const axios = require('axios');

// Fetches website HTML once — all Wave 2 analysis (broadcast, website quality,
// social, Hispanic fit) reuses this single response, no second fetch.
async function fetchWebsiteHtml(websiteUrl) {
  if (!websiteUrl) throw new Error('No website URL provided');

  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
  const response = await axios.get(url, {
    timeout: 8000,
    maxRedirects: 5,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    },
  });

  return typeof response.data === 'string' ? response.data : String(response.data);
}

module.exports = { fetchWebsiteHtml };
