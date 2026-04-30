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
    });

    const data = response.data;
    const ads = data.ads || [];
    const inlineAds = (data.inline_shopping_results || []);
    const totalAds = ads.length + inlineAds.length;

    // Check if the business itself appears in ads
    const businessAds = ads.filter((ad) => {
      const title = (ad.title || '').toLowerCase();
      const displayed_link = (ad.displayed_link || '').toLowerCase();
      const nameLower = businessName.toLowerCase();
      return title.includes(nameLower) || displayed_link.includes(nameLower);
    });

    const hasOwnAds = businessAds.length > 0;
    let score;

    if (totalAds === 0 && !hasOwnAds) {
      score = Math.floor(Math.random() * 6); // 0-5
    } else if (hasOwnAds || totalAds >= 3) {
      score = 25 + Math.floor(Math.random() * 6); // 25-30
    } else {
      score = 10 + Math.floor(Math.random() * 11); // 10-20
    }

    return {
      score,
      hasGoogleAds: hasOwnAds || totalAds > 0,
      adCount: totalAds,
    };
  } catch (err) {
    console.error('SerpAPI business ad check error:', err.message);
    return { score: 0, hasGoogleAds: false, adCount: 0 };
  }
}

async function checkCompetitorAdPresence(category, city) {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) return { score: 23, competitorAdCount: 0 };

  try {
    const query = `${category} ${city}`;
    const response = await axios.get(SERP_BASE, {
      params: {
        engine: 'google',
        q: query,
        location: 'Los Angeles, California',
        api_key: apiKey,
        num: 10,
      },
    });

    const data = response.data;
    const ads = data.ads || [];
    const competitorCount = ads.length;

    let score;
    if (competitorCount >= 4) {
      score = Math.floor(Math.random() * 6); // 0-5
    } else if (competitorCount >= 2) {
      score = 8 + Math.floor(Math.random() * 8); // 8-15
    } else if (competitorCount === 1) {
      score = 18 + Math.floor(Math.random() * 5); // 18-22
    } else {
      score = 23 + Math.floor(Math.random() * 3); // 23-25
    }

    return { score, competitorAdCount: competitorCount };
  } catch (err) {
    console.error('SerpAPI competitor check error:', err.message);
    return { score: 23, competitorAdCount: 0 };
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
    });

    const data = response.data;
    const organicResults = data.organic_results || [];

    const hasFacebook = organicResults.some(
      (r) => r.link && r.link.includes('facebook.com')
    );
    const hasInstagram = organicResults.some(
      (r) => r.link && r.link.includes('instagram.com')
    );

    // Check snippet for signals of activity
    const hasActivity = organicResults.some((r) => {
      const snippet = (r.snippet || '').toLowerCase();
      return (
        snippet.includes('followers') ||
        snippet.includes('likes') ||
        snippet.includes('posts') ||
        snippet.includes('photos')
      );
    });

    let score;
    if (!hasFacebook && !hasInstagram) {
      score = Math.floor(Math.random() * 3); // 0-2
    } else if (hasFacebook || hasInstagram) {
      if (hasActivity) {
        score = 8 + Math.floor(Math.random() * 3); // 8-10
      } else {
        score = 3 + Math.floor(Math.random() * 3); // 3-5
      }
    }

    return { score, hasFacebook, hasInstagram };
  } catch (err) {
    console.error('SerpAPI social check error:', err.message);
    return { score: 0, hasFacebook: false, hasInstagram: false };
  }
}

module.exports = { checkBusinessAdPresence, checkCompetitorAdPresence, checkSocialMediaPresence };
