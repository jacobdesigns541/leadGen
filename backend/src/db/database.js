const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../leadgen.db');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let db;

function persistDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  // The scoring engine was rebuilt from scratch — old cached rows use an
  // incompatible schema (tv/radio/website-checker scores) and must be dropped.
  const existingCols = queryAll(`PRAGMA table_info(cached_leads)`);
  const hasNewSchema = existingCols.some((c) => c.name === 'score_digital');
  if (existingCols.length > 0 && !hasNewSchema) {
    db.run('DROP TABLE cached_leads');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS cached_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT NOT NULL,
      search_key TEXT NOT NULL,
      business_name TEXT,
      category TEXT,
      address TEXT,
      phone TEXT,
      website TEXT,
      rating REAL,
      review_count INTEGER,
      latitude REAL,
      longitude REAL,
      zip_code TEXT,
      owner_name TEXT,
      owner_title TEXT,
      owner_email TEXT,
      score_digital INTEGER,
      score_broadcast INTEGER,
      score_website INTEGER,
      score_reviews INTEGER,
      score_social INTEGER,
      score_composite INTEGER DEFAULT 0,
      digital_unavailable INTEGER DEFAULT 0,
      broadcast_unavailable INTEGER DEFAULT 0,
      tier TEXT,
      no_google_ads INTEGER DEFAULT 0,
      no_meta_ads INTEGER DEFAULT 0,
      broadcast_notes TEXT DEFAULT '[]',
      website_signals TEXT DEFAULT '{}',
      hispanic_signals TEXT DEFAULT '{}',
      youtube_results TEXT DEFAULT '[]',
      pitch_note TEXT,
      cached_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_place_id ON cached_leads(place_id);
    CREATE INDEX IF NOT EXISTS idx_search_key ON cached_leads(search_key);
  `);

  persistDb();
  console.log('Database initialized at', DB_PATH);
}

function getCachedLeads(searchKey) {
  return queryAll(
    'SELECT * FROM cached_leads WHERE search_key = ? AND expires_at > ?',
    [searchKey, Date.now()]
  );
}

function saveLead(searchKey, lead) {
  const existing = queryOne(
    'SELECT id FROM cached_leads WHERE place_id = ? AND search_key = ?',
    [lead.placeId, searchKey]
  );

  const now = Date.now();
  const vals = [
    lead.businessName, lead.category, lead.address, lead.phone, lead.website,
    lead.rating, lead.reviewCount, lead.latitude, lead.longitude, lead.zipCode,
    lead.ownerName, lead.ownerTitle, lead.ownerEmail,
    lead.scores.digital, lead.scores.broadcast, lead.scores.website,
    lead.scores.reviews, lead.scores.social, lead.scores.composite,
    lead.unavailable?.digital ? 1 : 0, lead.unavailable?.broadcast ? 1 : 0,
    lead.tier,
    lead.noGoogleAds ? 1 : 0, lead.noMetaAds ? 1 : 0,
    JSON.stringify(lead.broadcastNotes || []),
    JSON.stringify(lead.websiteSignals || {}),
    JSON.stringify(lead.hispanicFit || {}),
    JSON.stringify(lead.youtubeResults || []),
    lead.pitchNote, now, now + CACHE_TTL_MS,
  ];

  if (existing) {
    db.run(`
      UPDATE cached_leads SET
        business_name=?, category=?, address=?, phone=?, website=?, rating=?, review_count=?,
        latitude=?, longitude=?, zip_code=?,
        owner_name=?, owner_title=?, owner_email=?,
        score_digital=?, score_broadcast=?, score_website=?, score_reviews=?, score_social=?, score_composite=?,
        digital_unavailable=?, broadcast_unavailable=?, tier=?,
        no_google_ads=?, no_meta_ads=?,
        broadcast_notes=?, website_signals=?, hispanic_signals=?, youtube_results=?,
        pitch_note=?, cached_at=?, expires_at=?
      WHERE place_id=? AND search_key=?
    `, [...vals, lead.placeId, searchKey]);
  } else {
    db.run(`
      INSERT INTO cached_leads
        (place_id, search_key, business_name, category, address, phone, website, rating, review_count,
         latitude, longitude, zip_code, owner_name, owner_title, owner_email,
         score_digital, score_broadcast, score_website, score_reviews, score_social, score_composite,
         digital_unavailable, broadcast_unavailable, tier, no_google_ads, no_meta_ads,
         broadcast_notes, website_signals, hispanic_signals, youtube_results,
         pitch_note, cached_at, expires_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [lead.placeId, searchKey, ...vals]);
  }

  persistDb();
}

function getCacheStats() {
  return queryOne('SELECT COUNT(*) as total, MAX(cached_at) as last_updated FROM cached_leads');
}

function rowToLead(row) {
  return {
    placeId: row.place_id,
    businessName: row.business_name,
    category: row.category,
    address: row.address,
    phone: row.phone,
    website: row.website,
    rating: row.rating,
    reviewCount: row.review_count,
    latitude: row.latitude,
    longitude: row.longitude,
    zipCode: row.zip_code,
    ownerName: row.owner_name,
    ownerTitle: row.owner_title,
    ownerEmail: row.owner_email,
    scores: {
      digital: row.score_digital,
      broadcast: row.score_broadcast,
      website: row.score_website,
      reviews: row.score_reviews,
      social: row.score_social,
      composite: row.score_composite,
    },
    unavailable: {
      digital: row.digital_unavailable === 1,
      broadcast: row.broadcast_unavailable === 1,
    },
    tier: row.tier,
    noGoogleAds: row.no_google_ads === 1,
    noMetaAds: row.no_meta_ads === 1,
    broadcastNotes: row.broadcast_notes ? JSON.parse(row.broadcast_notes) : [],
    websiteSignals: row.website_signals ? JSON.parse(row.website_signals) : {},
    hispanicFit: row.hispanic_signals ? JSON.parse(row.hispanic_signals) : null,
    youtubeResults: row.youtube_results ? JSON.parse(row.youtube_results) : [],
    pitchNote: row.pitch_note,
    cachedAt: row.cached_at,
    expiresAt: row.expires_at,
  };
}

module.exports = { initDb, getCachedLeads, saveLead, getCacheStats, rowToLead };
