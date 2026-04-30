const { checkBusinessAdPresence, checkCompetitorAdPresence, checkSocialMediaPresence } = require('./serpApi');
const { checkWebsiteQuality } = require('./websiteChecker');
const { enrichBusinessContact } = require('./apolloApi');

const HISPANIC_ZIPS = new Set([
  '90022', '90023', '90033', '90063', '90255', '90270', '90280', '90262',
  '90044', '90003', '90011', '90058', '90640', '91030', '91733', '91401',
  '91405', '91340', '90650', '90706', '90723',
]);

function scoreTier(composite) {
  if (composite <= 30) return 'hot';
  if (composite <= 60) return 'warm';
  return 'low';
}

function generatePitchNote(businessName, scores, isHispanicZip) {
  const weaknesses = [];

  if (scores.digitalAds <= 5) weaknesses.push('no Google Ads presence');
  else if (scores.digitalAds <= 15) weaknesses.push('limited paid search visibility');

  if (scores.website <= 5) weaknesses.push('no website or weak web presence');
  else if (scores.website <= 10) weaknesses.push('outdated website lacking tracking');

  if (scores.social <= 2) weaknesses.push('no detectable social media activity');
  else if (scores.social <= 5) weaknesses.push('sparse social media presence');

  if (scores.reviews <= 3) weaknesses.push('very few online reviews');
  else if (scores.reviews <= 7) weaknesses.push('limited review count');

  if (scores.competitorAds <= 5) weaknesses.push('competitors actively running ads in this space');

  if (weaknesses.length === 0) {
    return `${businessName} appears to have strong digital presence — focus pitch on growth and ROI optimization.`;
  }

  const topWeakness = weaknesses.slice(0, 2).join(' and ');
  const hispanicNote = isHispanicZip
    ? ' Located in a high-density Hispanic market area — ideal for Spanish-language campaigns.'
    : '';

  return `${businessName} shows ${topWeakness}.${hispanicNote} Strong candidate for a full digital marketing package.`;
}

function scoreReviews(rating, reviewCount) {
  let score = 0;

  if (reviewCount >= 150 && rating >= 4.5) {
    score = 13 + Math.floor(Math.random() * 3); // 13-15
  } else if (reviewCount >= 50) {
    score = 8 + Math.floor(Math.random() * 5); // 8-12
  } else if (reviewCount >= 10) {
    score = 4 + Math.floor(Math.random() * 4); // 4-7
  } else {
    score = Math.floor(Math.random() * 4); // 0-3
  }

  if (rating > 0 && rating < 3.5) score = Math.max(0, score - 2);

  return score;
}

async function scoreLead(business) {
  const { businessName, category, address, website, rating, reviewCount, zipCode } = business;

  // Extract city from address
  const city = extractCity(address) || 'Los Angeles';

  // Run all scoring checks in parallel
  const [adResult, competitorResult, websiteResult, socialResult, contactResult] = await Promise.all([
    checkBusinessAdPresence(businessName, category, city),
    checkCompetitorAdPresence(category, city),
    checkWebsiteQuality(website),
    checkSocialMediaPresence(businessName),
    enrichBusinessContact(website, businessName),
  ]);

  const reviewScore = scoreReviews(rating, reviewCount);
  const isHispanicZip = HISPANIC_ZIPS.has(zipCode);

  const scores = {
    digitalAds: adResult.score,
    competitorAds: competitorResult.score,
    website: websiteResult.score,
    reviews: reviewScore,
    social: socialResult.score,
  };

  let composite =
    scores.digitalAds +
    scores.competitorAds +
    scores.website +
    scores.reviews +
    scores.social;

  if (isHispanicZip) composite = Math.max(0, composite - 5);

  scores.composite = composite;

  const pitchNote = generatePitchNote(businessName, scores, isHispanicZip);

  return {
    ...business,
    isHispanicZip,
    ownerName: contactResult.ownerName,
    ownerTitle: contactResult.ownerTitle,
    ownerEmail: contactResult.ownerEmail,
    scores,
    tier: scoreTier(composite),
    noGoogleAds: !adResult.hasGoogleAds,
    noMetaAds: !websiteResult.hasFBPixel,
    pitchNote,
    rawData: {
      adResult,
      competitorResult,
      websiteResult,
      socialResult,
    },
  };
}

function extractCity(address) {
  if (!address) return 'Los Angeles';
  // Format: "123 Main St, Los Angeles, CA 90001, USA"
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts[1].trim();
  }
  return 'Los Angeles';
}

module.exports = { scoreLead, scoreTier, HISPANIC_ZIPS };
