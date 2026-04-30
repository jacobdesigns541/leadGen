const axios = require('axios');

const SERP_BASE = 'https://serpapi.com/search';

async function checkBusinessAdPresence(businessName, category, city) {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) return { score: 0, hasGoogleAds: false, adCount: 0 };

  try {
    const query = `${businessName} ${category} ${city}`;
    const response = await axios.get(SERP_BASE, {
      params: {
        engine: 'google',
        q: query,
        location: 'Los Angeles, California',
        api_key: apiKey,
        num: 10,
      },
      timeout: 10000,
    });

    const data = response.data;
    const ads = data.ads || [];
    const inlineAds = data.inline_shopping_results || [];
    const totalAds = ads.length + inlineAds.length;

    const nameLower = businessName.toLowerCase();
    const hasOwnAds = ads.some((ad) => {
      const title = (ad.title || '').toLowerCase();
      const link = (ad.displayed_link || '').toLowerCase();
      return title.includes(nameLower) || link.includes(nameLower);
    });

    // Scale: 0-20 pts (max)
    let score;
    if (totalAds === 0 && !hasOwnAds) {
      score = Math.floor(Math.random() * 4);       // 0-3  — no ads = opportunity
    } else if (hasOwnAds || totalAds >= 3) {
      score = 16 + Math.floor(Math.random() * 5);  // 16-20 — strong ad presence
    } else {
      score = 7 + Math.floor(Math.random() * 7);   // 7-13 — some presence
    }

    return { score, hasGoogleAds: hasOwnAds || totalAds > 0, adCount: totalAds };
  } catch (err) {
    console.error('[serpApi] business ad check error:', err.message);
    return { score: 0, hasGoogleAds: false, adCount: 0 };
  }
}

async function checkSocialMediaPresence(businessName) {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) return { score: 0, hasFacebook: false, hasInstagram: false };

  try {
    const query = `${businessName} Facebook Instagram`;
    const response = await axios.get(SERP_BASE, {
      params: {
        engine: 'google',
        q: query,
        location: 'Los Angeles, California',
        api_key: apiKey,
        num: 10,
      },
      timeout: 10000,
    });

    const organicResults = response.data.organic_results || [];

    const hasFacebook = organicResults.some((r) => r.link?.includes('facebook.com'));
    const hasInstagram = organicResults.some((r) => r.link?.includes('instagram.com'));
    const hasActivity = organicResults.some((r) => {
      const snippet = (r.snippet || '').toLowerCase();
      return (
        snippet.includes('followers') ||
        snippet.includes('likes') ||
        snippet.includes('posts') ||
        snippet.includes('photos')
      );
    });

    // Scale: 0-10 pts (max)
    let score;
    if (!hasFacebook && !hasInstagram) {
      score = Math.floor(Math.random() * 3);       // 0-2
    } else if (hasActivity) {
      score = 7 + Math.floor(Math.random() * 4);   // 7-10
    } else {
      score = 3 + Math.floor(Math.random() * 4);   // 3-6
    }

    return { score, hasFacebook, hasInstagram };
  } catch (err) {
    console.error('[serpApi] social check error:', err.message);
    return { score: 0, hasFacebook: false, hasInstagram: false };
  }
}

module.exports = { checkBusinessAdPresence, checkSocialMediaPresence };
