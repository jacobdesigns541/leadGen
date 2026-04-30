const axios = require('axios');

const SERPER_BASE = 'https://google.serper.dev/search';

async function serperSearch(query) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  const response = await axios.post(
    SERPER_BASE,
    {
      q: query,
      gl: 'us',
      location: 'Los Angeles, California, United States',
    },
    {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
  return response.data;
}

async function checkBusinessAdPresence(businessName, category, city) {
  if (!process.env.SERPER_API_KEY) return { score: 0, hasGoogleAds: false, adCount: 0 };

  try {
    const data = await serperSearch(`${businessName} ${category} ${city}`);
    const ads = data?.ads || [];
    const totalAds = ads.length;

    const nameLower = businessName.toLowerCase();
    const hasOwnAds = ads.some((ad) => {
      const title = (ad.title || '').toLowerCase();
      const link = (ad.sitelinks?.[0]?.link || ad.link || '').toLowerCase();
      return title.includes(nameLower) || link.includes(nameLower);
    });

    // Scale: 0-20 pts
    let score;
    if (totalAds === 0 && !hasOwnAds) {
      score = Math.floor(Math.random() * 4);       // 0-3  — no ads = opportunity
    } else if (hasOwnAds || totalAds >= 3) {
      score = 16 + Math.floor(Math.random() * 5);  // 16-20 — strong presence
    } else {
      score = 7 + Math.floor(Math.random() * 7);   // 7-13 — some presence
    }

    return { score, hasGoogleAds: hasOwnAds || totalAds > 0, adCount: totalAds };
  } catch (err) {
    console.error('[serper] business ad check error:', err.message);
    return { score: 0, hasGoogleAds: false, adCount: 0 };
  }
}

async function checkSocialMediaPresence(businessName) {
  if (!process.env.SERPER_API_KEY) return { score: 0, hasFacebook: false, hasInstagram: false };

  try {
    const data = await serperSearch(`${businessName} Facebook Instagram`);
    const organic = data?.organic || [];

    const hasFacebook = organic.some((r) => r.link?.includes('facebook.com'));
    const hasInstagram = organic.some((r) => r.link?.includes('instagram.com'));
    const hasActivity = organic.some((r) => {
      const snippet = (r.snippet || '').toLowerCase();
      return (
        snippet.includes('followers') ||
        snippet.includes('likes') ||
        snippet.includes('posts') ||
        snippet.includes('photos')
      );
    });

    // Scale: 0-10 pts
    let score;
    if (!hasFacebook && !hasInstagram) {
      score = Math.floor(Math.random() * 3);      // 0-2
    } else if (hasActivity) {
      score = 7 + Math.floor(Math.random() * 4);  // 7-10
    } else {
      score = 3 + Math.floor(Math.random() * 4);  // 3-6
    }

    return { score, hasFacebook, hasInstagram };
  } catch (err) {
    console.error('[serper] social check error:', err.message);
    return { score: 0, hasFacebook: false, hasInstagram: false };
  }
}

module.exports = { checkBusinessAdPresence, checkSocialMediaPresence };
