const { getPlaceDetails } = require('./googlePlaces');
const { checkDigitalAds } = require('./digitalAdsScoring');
const { searchCommercial, searchTvRadioSpot } = require('./youtubeApi');
const { enrichBusinessContact } = require('./apolloApi');
const { fetchWebsiteHtml } = require('./websiteFetch');
const { scoreBroadcast } = require('./broadcastScoring');
const { scoreWebsiteQuality } = require('./websiteQualityScoring');
const { scoreReviews } = require('./reviewsScoring');
const { findSocialLinks, checkRecentActivity } = require('./socialScoring');
const { analyzeHispanicFit } = require('./hispanicFit');

// Wraps every external API call so one failure never fails the whole business,
// and logs metric/business/status/timing for every call as required.
async function timedCall(metricName, businessName, fn) {
  const start = Date.now();
  try {
    const data = await fn();
    console.log(`[api] metric=${metricName} business="${businessName}" status=ok time=${Date.now() - start}ms`);
    return { ok: true, data };
  } catch (err) {
    const status = err.response?.status || 'error';
    console.error(`[api] metric=${metricName} business="${businessName}" status=${status} time=${Date.now() - start}ms error=${err.message}`);
    return { ok: false, error: err };
  }
}

function scoreTier(composite) {
  if (composite <= 30) return 'hot';
  if (composite <= 60) return 'warm';
  return 'low';
}

function extractCity(address) {
  if (!address) return 'Los Angeles';
  const parts = address.split(',');
  return parts.length >= 2 ? parts[1].trim() : 'Los Angeles';
}

function generatePitchNote({ digitalScore, broadcastScoreVal, broadcastNotes, websiteScoreVal, hispanicFit }) {
  const notes = [];

  if (digitalScore !== null && digitalScore >= 22 && digitalScore <= 25) {
    notes.push('No Google Ads detected');
  }
  if (broadcastScoreVal !== null && broadcastScoreVal >= 20 && broadcastScoreVal <= 24) {
    notes.push('No broadcast media presence detected');
  }
  if (broadcastNotes.some((n) => n.startsWith('🎬 YouTube video found'))) {
    notes.push('YouTube commercial found — confirm if currently airing');
  }
  if (websiteScoreVal !== null && websiteScoreVal >= 20 && websiteScoreVal <= 25) {
    notes.push('Weak or no web presence');
  }
  if (
    (hispanicFit.level === 'strong' || hispanicFit.level === 'possible') &&
    broadcastScoreVal !== null &&
    broadcastScoreVal >= 20
  ) {
    notes.push('No Spanish-language broadcast presence detected for a business serving the Hispanic market');
  }

  if (notes.length === 0) {
    return 'Strong overall presence — pitch on growth and ROI optimization.';
  }
  return notes.join('. ') + '.';
}

async function scoreLead(business) {
  const { placeId, businessName, category } = business;
  const city = extractCity(business.address);

  // ── Wave 1: fire all simultaneously ──────────────────────────────────────
  const [placesResult, adsResult, apolloResult, yt1Result, yt2Result] = await Promise.all([
    timedCall('places-details', businessName, () => getPlaceDetails(placeId)),
    timedCall('digital-ads', businessName, () => checkDigitalAds(businessName, category, city)),
    timedCall('apollo-enrich', businessName, () => enrichBusinessContact(business.website, businessName)),
    timedCall('youtube-commercial', businessName, () => searchCommercial(businessName)),
    timedCall('youtube-tv-radio', businessName, () => searchTvRadioSpot(businessName)),
  ]);

  const placeDetails = placesResult.ok ? placesResult.data : business;
  const website = placeDetails.website || business.website || '';
  const rating = placeDetails.rating ?? business.rating ?? 0;
  const reviewCount = placeDetails.reviewCount ?? business.reviewCount ?? 0;
  const zipCode = placeDetails.zipCode || business.zipCode || '';

  const contact = apolloResult.ok ? apolloResult.data : { ownerName: null, ownerTitle: null, ownerEmail: null };
  const youtubeVideos = [
    ...(yt1Result.ok ? yt1Result.data : []),
    ...(yt2Result.ok ? yt2Result.data : []),
  ];

  let digitalScore = null;
  const digitalUnavailable = !adsResult.ok;
  if (adsResult.ok) {
    digitalScore = adsResult.data.hasAds ? 3 : 23;
  }

  // ── Wave 2: fires after Wave 1 — uses the website URL from Places details ──
  const websiteFetchResult = await timedCall('website-fetch', businessName, () => fetchWebsiteHtml(website));
  const htmlAvailable = websiteFetchResult.ok;
  const html = htmlAvailable ? websiteFetchResult.data : null;

  const broadcastResult = scoreBroadcast({ html, htmlAvailable, youtubeVideos });
  const websiteQualityResult = scoreWebsiteQuality({
    hasWebsiteUrl: !!website,
    htmlAvailable,
    html,
    isHttps: website.startsWith('https://'),
  });
  const reviewsResult = scoreReviews(rating, reviewCount);

  let socialScoreVal;
  const socialNotes = [];
  if (!htmlAvailable) {
    socialScoreVal = 5; // neutral — unknown, fetch failed or no website
  } else {
    const socialLinks = findSocialLinks(html);
    if (socialLinks.length === 0) {
      socialScoreVal = 10;
    } else {
      const recentResult = await timedCall('social-recency', businessName, () => checkRecentActivity(businessName));
      if (recentResult.ok) {
        socialScoreVal = recentResult.data ? 2 : 6;
      } else {
        socialScoreVal = 6;
        socialNotes.push('Social recency check unavailable');
      }
    }
  }

  const hispanicFitResult = analyzeHispanicFit({ business, html, htmlAvailable, zipCode });

  // Composite: null metrics (failed checks) contribute 0 rather than distorting the sum
  const scoreParts = [digitalScore, broadcastResult.score, websiteQualityResult.score, reviewsResult.score, socialScoreVal];
  let composite = scoreParts.reduce((sum, s) => sum + (s ?? 0), 0);
  if (hispanicFitResult.level === 'strong' || hispanicFitResult.level === 'possible') {
    composite -= 5;
  }
  composite = Math.max(0, Math.min(100, composite));

  const pitchNote = generatePitchNote({
    digitalScore,
    broadcastScoreVal: broadcastResult.score,
    broadcastNotes: broadcastResult.notes,
    websiteScoreVal: websiteQualityResult.score,
    hispanicFit: hispanicFitResult,
  });

  return {
    ...business,
    website,
    rating,
    reviewCount,
    zipCode,
    ownerName: contact.ownerName,
    ownerTitle: contact.ownerTitle,
    ownerEmail: contact.ownerEmail,
    scores: {
      digital: digitalScore,
      broadcast: broadcastResult.score,
      website: websiteQualityResult.score,
      reviews: reviewsResult.score,
      social: socialScoreVal,
      composite,
    },
    unavailable: {
      digital: digitalUnavailable,
      broadcast: broadcastResult.score === null,
    },
    tier: scoreTier(composite),
    noGoogleAds: digitalScore !== null && digitalScore >= 20,
    noMetaAds: digitalScore !== null && digitalScore >= 20,
    broadcastNotes: broadcastResult.notes,
    websiteSignals: websiteQualityResult.signals,
    socialNotes,
    hispanicFit: hispanicFitResult,
    youtubeResults: youtubeVideos,
    reviewNotes: reviewsResult.notes,
    pitchNote,
  };
}

module.exports = { scoreLead, scoreTier };
