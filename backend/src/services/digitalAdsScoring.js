const axios = require('axios');

const SERPER_BASE = 'https://google.serper.dev/search';

// Checks the Serper ads array only — binary signal, no middle ground.
async function checkDigitalAds(businessName, category, city) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error('SERPER_API_KEY is not set in environment');

  const response = await axios.post(
    SERPER_BASE,
    {
      q: `${businessName} ${category} ${city}`,
      gl: 'us',
      location: 'Los Angeles, California, United States',
    },
    {
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      timeout: 10000,
    }
  );

  const ads = response.data?.ads || [];
  return { hasAds: ads.length > 0, adCount: ads.length };
}

// Low score = not advertising = underperforming = good lead signal.
// High score = running strong ad campaigns = already well served on this channel.
function scoreDigitalAds(adCount) {
  if (adCount === 0) return 2; // Not running any Google Ads: 1-3 pts
  if (adCount <= 2) return 13; // Running some ads: 12-15 pts
  return 24; // Running strong ad campaigns: 22-25 pts
}

module.exports = { checkDigitalAds, scoreDigitalAds };
