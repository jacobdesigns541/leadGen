const { checkBusinessAdPresence, checkSocialMediaPresence } = require('./serpApi');
const { checkWebsiteQuality } = require('./websiteChecker');
const { checkTvPresence, checkRadioPresence } = require('./fccApi');
const { enrichBusinessContact } = require('./apolloApi');
const { fetchHispanicWebsite, analyzeHispanicFit } = require('./hispanicDetection');

// Scoring weights (must sum to 100)
// digitalAds: 20 | tv: 20 | radio: 20 | website: 20 | reviews: 10 | social: 10

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

function scoreReviews(rating, reviewCount) {
  // Max 10 pts
  let score;
  if (reviewCount >= 150 && rating >= 4.5) {
    score = 9 + Math.floor(Math.random() * 2);   // 9-10
  } else if (reviewCount >= 50) {
    score = 6 + Math.floor(Math.random() * 3);   // 6-8
  } else if (reviewCount >= 10) {
    score = 3 + Math.floor(Math.random() * 3);   // 3-5
  } else {
    score = Math.floor(Math.random() * 3);        // 0-2
  }
  if (rating > 0 && rating < 3.5) score = Math.max(0, score - 1);
  return score;
}

function generatePitchNote(businessName, scores, isHispanicZip) {
  const weaknesses = [];

  if (scores.digitalAds <= 3)
    weaknesses.push('no paid search presence');
  else if (scores.digitalAds <= 10)
    weaknesses.push('limited Google Ads visibility');

  if (scores.tv <= 3)
    weaknesses.push('no TV presence detected — strong broadcast opportunity');
  else if (scores.tv <= 8)
    weaknesses.push('limited TV advertising signal');

  if (scores.radio <= 3) {
    weaknesses.push(
      isHispanicZip
        ? 'no Spanish-language radio presence detected — KLAX and KBUE reach this market directly'
        : 'no radio advertising detected'
    );
  } else if (scores.radio <= 8) {
    weaknesses.push('limited radio advertising signal');
  }

  if (scores.website <= 5)
    weaknesses.push('no website or very weak web presence');
  else if (scores.website <= 10)
    weaknesses.push('outdated website lacking tracking pixels');

  if (scores.social <= 2)
    weaknesses.push('no detectable social media activity');

  if (scores.reviews <= 2)
    weaknesses.push('very few online reviews');

  if (weaknesses.length === 0) {
    return `${businessName} has strong digital and broadcast presence — pitch on growth and ROI optimization.`;
  }

  const topWeakness = weaknesses.slice(0, 2).join(' and ');
  const hispanicSuffix = isHispanicZip && scores.radio > 3
    ? ' Located in a high-density Hispanic market area — ideal for Spanish-language campaigns.'
    : '';

  return `${businessName} shows ${topWeakness}.${hispanicSuffix} Strong candidate for a full digital + broadcast package.`;
}

async function scoreLead(business) {
  const { businessName, category, address, website, rating, reviewCount, zipCode } = business;
  const city = extractCity(address) || 'Los Angeles';

  const [adResult, tvResult, radioResult, websiteResult, socialResult, contactResult, hispanicHtml] = await Promise.all([
    checkBusinessAdPresence(businessName, category, city),
    checkTvPresence(businessName),
    checkRadioPresence(businessName),
    checkWebsiteQuality(website),
    checkSocialMediaPresence(businessName),
    enrichBusinessContact(website, businessName),
    fetchHispanicWebsite(website),
  ]);

  const reviewScore = scoreReviews(rating, reviewCount);
  const isHispanicZip = HISPANIC_ZIPS.has(zipCode);

  const hispanicResult = analyzeHispanicFit({
    business,
    html: hispanicHtml,
    adSnippets: adResult.rawSnippets || [],
    socialSnippets: socialResult.rawSnippets || [],
    isHispanicZip,
  });

  const scores = {
    digitalAds: adResult.score,    // 0-20
    tv:         tvResult.score,    // 0-20
    radio:      radioResult.score, // 0-20
    website:    websiteResult.score, // 0-20
    reviews:    reviewScore,         // 0-10
    social:     socialResult.score,  // 0-10
  };

  let composite =
    scores.digitalAds + scores.tv + scores.radio +
    scores.website + scores.reviews + scores.social;

  if (hispanicResult.level === 'possible' || hispanicResult.level === 'strong') {
    composite = Math.max(0, composite - 5);
  }
  scores.composite = composite;

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
    noTvAds: !tvResult.hasEvidence,
    noRadioAds: !radioResult.hasEvidence,
    tvStations: tvResult.detectedTags || [],
    radioStations: radioResult.detectedTags || [],
    hispanicFit: hispanicResult,
    pitchNote: generatePitchNote(businessName, scores, isHispanicZip),
    rawData: { adResult, tvResult, radioResult, websiteResult, socialResult },
  };
}

function extractCity(address) {
  if (!address) return 'Los Angeles';
  const parts = address.split(',');
  return parts.length >= 2 ? parts[1].trim() : 'Los Angeles';
}

module.exports = { scoreLead, scoreTier, HISPANIC_ZIPS };
