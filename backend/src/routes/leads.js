const express = require('express');
const router = express.Router();
const { searchBusinesses } = require('../services/googlePlaces');
const { scoreLead } = require('../services/scoringEngine');
const { getCachedLeads, saveLead, rowToLead } = require('../db/database');

// Build a deterministic cache key for a search
function buildSearchKey(businessType, location, radiusMiles) {
  return `${businessType.toLowerCase().trim()}|${location.toLowerCase().trim()}|${radiusMiles}`;
}

// POST /api/leads/search
router.post('/search', async (req, res) => {
  try {
    const { businessType, location, radiusMiles = 60 } = req.body;

    if (!businessType || !location) {
      return res.status(400).json({ error: 'businessType and location are required' });
    }

    const searchKey = buildSearchKey(businessType, location, radiusMiles);

    // Check cache first
    const cached = getCachedLeads(searchKey);
    if (cached.length > 0) {
      console.log(`Cache hit for "${searchKey}" — returning ${cached.length} leads`);
      const leads = cached.map(rowToLead).sort((a, b) => a.scores.composite - b.scores.composite);
      return res.json({ leads, fromCache: true, searchKey });
    }

    // Fetch from Google Places
    console.log(`Fetching from Google Places: "${businessType}" near "${location}" (${radiusMiles}mi)`);
    const businesses = await searchBusinesses(businessType, location, radiusMiles);

    if (!businesses || businesses.length === 0) {
      return res.json({ leads: [], fromCache: false, searchKey });
    }

    // Score each business (parallel, max 5 at a time to avoid rate limits)
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

    // Cache results
    for (const lead of scoredLeads) {
      try {
        saveLead(searchKey, lead);
      } catch (err) {
        console.error('Cache save error:', err.message);
      }
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
    const Database = require('better-sqlite3');
    const path = require('path');
    const db = new Database(path.join(__dirname, '../../leadgen.db'));
    const stats = db.prepare('SELECT COUNT(*) as total, MAX(created_at) as last_updated FROM cached_leads').get();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
