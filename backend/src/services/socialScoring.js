const axios = require('axios');

const SERPER_BASE = 'https://google.serper.dev/search';

const SOCIAL_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'tiktok.com', 'youtube.com', 'linkedin.com',
];

const RECENCY_HINTS = [
  'hours ago', 'hour ago', 'minutes ago', 'minute ago',
  'days ago', 'day ago', 'this week', 'today', 'yesterday', 'updated',
];

const ENGAGEMENT_HINTS = [
  'followers', 'subscribers', 'likes', 'reviews', 'comments', 'shares', 'k followers',
];

function findSocialLinks(html) {
  const hrefRe = /href=["']([^"']+)["']/gi;
  const found = new Set();
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1].toLowerCase();
    for (const domain of SOCIAL_DOMAINS) {
      if (href.includes(domain)) found.add(domain);
    }
  }
  return [...found];
}

async function checkRecentActivity(businessName) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error('SERPER_API_KEY is not set in environment');

  const response = await axios.post(
    SERPER_BASE,
    {
      q: `${businessName} facebook instagram`,
      gl: 'us',
      location: 'Los Angeles, California, United States',
    },
    {
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      timeout: 10000,
    }
  );

  const organic = response.data?.organic || [];
  const snippets = organic.map((r) => (r.snippet || '').toLowerCase());

  return {
    recent: snippets.some((s) => RECENCY_HINTS.some((h) => s.includes(h))),
    highEngagement: snippets.some((s) => ENGAGEMENT_HINTS.some((h) => s.includes(h))),
  };
}

module.exports = { findSocialLinks, checkRecentActivity };
