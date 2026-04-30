const express = require('express');
const router = express.Router();
const { searchBusinesses } = require('../services/googlePlaces');
const { scoreLead } = require('../services/scoringEngine');
const { getCachedLeads, saveLead, getCacheStats, rowToLead } = require('../db/database');

const ALL_BUSINESS_TYPES = [
  'Auto Dealership',
  'Immigration Law',
  'Family Law',
  'Dental / Orthodontic',
  'Tax / Accounting',
  'Insurance Broker',
  'Home Services / HVAC',
  'Event Venue / Quinceañera',
  'Restaurant Group',
  'Real Estate',
  'Notary Services',
];

const DEFAULT_LOCATION = '90012';

function buildSearchKey(businessType, location, radiusMiles) {
  return `${businessType.toLowerCase().trim()}|${location.toLowerCase().trim()}|${radiusMiles}`;
}

async function fetchAndScoreCategory(businessType, location, radiusMiles, searchKey) {
  console.log(`[leads] Fetching "${businessType}" near "${location}" radius=${radiusMiles}mi`);

  let businesses;
  try {
    businesses = await searchBusinesses(businessType, location, radiusMiles);
  } catch (err) {
    // Surface the real API error rather than swallowing it
    console.error(`[leads] searchBusinesses failed for "${businessType}":`, err.message);
    throw err;
  }

  if (!businesses || businesses.length === 0) {
    console.log(`[leads] No results for "${businessType}"`);
    return [];
  }

  console.log(`[leads] Scoring ${businesses.length} businesses for "${businessType}"`);
  const chunkSize = 5;
  const scoredLeads = [];

  for (let i = 0; i < businesses.length; i += chunkSize) {
    const chunk = businesses.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map((b) => scoreLead({ ...b, category: businessType }))
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        scoredLeads.push(result.value);
      } else {
        console.error(`[leads] scoreLead error:`, result.reason?.message || result.reason);
      }
    }
  }

  for (const lead of scoredLeads) {
    try {
      saveLead(searchKey, lead);
    } catch (err) {
      console.error('[leads] Cache save error:', err.message);
    }
  }

  return scoredLeads;
}

// POST /api/leads/search
router.post('/search', async (req, res) => {
  try {
    let { businessType = 'all', location = DEFAULT_LOCATION, radiusMiles = 60 } = req.body;

    if (!location || !location.trim()) location = DEFAULT_LOCATION;
    const isAll = !businessType || businessType.toLowerCase() === 'all';

    console.log(`[leads] Search request: type="${businessType}" location="${location}" radius=${radiusMiles}mi`);

    const searchKey = buildSearchKey(isAll ? 'all' : businessType, location, radiusMiles);

    // Cache check
    const cached = getCachedLeads(searchKey);
    if (cached.length > 0) {
      console.log(`[leads] Cache hit for "${searchKey}" — ${cached.length} leads`);
      const leads = cached.map(rowToLead).sort((a, b) => a.scores.composite - b.scores.composite);
      return res.json({ leads, fromCache: true, searchKey });
    }

    let scoredLeads = [];

    if (isAll) {
      // Run all categories — per-category errors are logged but don't abort the whole search
      for (const type of ALL_BUSINESS_TYPES) {
        try {
          const leads = await fetchAndScoreCategory(type, location, radiusMiles, searchKey);
          scoredLeads.push(...leads);
        } catch (err) {
          console.error(`[leads] Skipping "${type}" due to error:`, err.message);
        }
      }
    } else {
      // Single category — let the error propagate so the client sees it
      scoredLeads = await fetchAndScoreCategory(businessType, location, radiusMiles, searchKey);
    }

    const sorted = scoredLeads.sort((a, b) => a.scores.composite - b.scores.composite);
    console.log(`[leads] Returning ${sorted.length} scored leads`);
    res.json({ leads: sorted, fromCache: false, searchKey });
  } catch (err) {
    // Return the real error message — this is what shows in the frontend
    console.error('[leads] Search failed:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/leads/cache-stats
router.get('/cache-stats', (req, res) => {
  try {
    res.json(getCacheStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
