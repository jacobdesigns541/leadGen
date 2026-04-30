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
  const businesses = await searchBusinesses(businessType, location, radiusMiles);
  if (!businesses || businesses.length === 0) return [];

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
        console.error('Scoring error:', result.reason);
      }
    }
  }

  for (const lead of scoredLeads) {
    try {
      saveLead(searchKey, lead);
    } catch (err) {
      console.error('Cache save error:', err.message);
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

    const searchKey = buildSearchKey(isAll ? 'all' : businessType, location, radiusMiles);

    // Check cache first
    const cached = getCachedLeads(searchKey);
    if (cached.length > 0) {
      console.log(`Cache hit for "${searchKey}" — returning ${cached.length} leads`);
      const leads = cached.map(rowToLead).sort((a, b) => a.scores.composite - b.scores.composite);
      return res.json({ leads, fromCache: true, searchKey });
    }

    let scoredLeads = [];

    if (isAll) {
      // Search all categories sequentially to avoid hammering APIs
      console.log(`Searching all business types near "${location}" (${radiusMiles}mi)`);
      for (const type of ALL_BUSINESS_TYPES) {
        const leads = await fetchAndScoreCategory(type, location, radiusMiles, searchKey);
        scoredLeads.push(...leads);
      }
    } else {
      console.log(`Searching "${businessType}" near "${location}" (${radiusMiles}mi)`);
      scoredLeads = await fetchAndScoreCategory(businessType, location, radiusMiles, searchKey);
    }

    const sorted = scoredLeads.sort((a, b) => a.scores.composite - b.scores.composite);
    res.json({ leads: sorted, fromCache: false, searchKey });
  } catch (err) {
    console.error('Search error:', err.message, err.stack);
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
