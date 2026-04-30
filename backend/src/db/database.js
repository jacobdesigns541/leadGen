const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../leadgen.db');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function initDb() {
  const database = getDb();
  database.exec(`
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
      is_hispanic_zip INTEGER DEFAULT 0,
      owner_name TEXT,
      owner_title TEXT,
      owner_email TEXT,
      score_digital_ads INTEGER DEFAULT 0,
      score_competitor_ads INTEGER DEFAULT 0,
      score_website INTEGER DEFAULT 0,
      score_reviews INTEGER DEFAULT 0,
      score_social INTEGER DEFAULT 0,
      score_composite INTEGER DEFAULT 0,
      no_google_ads INTEGER DEFAULT 0,
      no_meta_ads INTEGER DEFAULT 0,
      pitch_note TEXT,
      raw_data TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_place_id ON cached_leads(place_id);
    CREATE INDEX IF NOT EXISTS idx_search_key ON cached_leads(search_key);
  `);
  console.log('Database initialized at', DB_PATH);
}

function getCachedLeads(searchKey) {
  const database = getDb();
  const cutoff = Date.now() - CACHE_TTL_MS;
  const rows = database.prepare(
    'SELECT * FROM cached_leads WHERE search_key = ? AND created_at > ?'
  ).all(searchKey, cutoff);
  return rows;
}

function saveLead(searchKey, lead) {
  const database = getDb();
  const existing = database.prepare(
    'SELECT id FROM cached_leads WHERE place_id = ? AND search_key = ?'
  ).get(lead.placeId, searchKey);

  if (existing) {
    database.prepare(`
      UPDATE cached_leads SET
        business_name=?, category=?, address=?, phone=?, website=?, rating=?, review_count=?,
        latitude=?, longitude=?, zip_code=?, is_hispanic_zip=?,
        owner_name=?, owner_title=?, owner_email=?,
        score_digital_ads=?, score_competitor_ads=?, score_website=?, score_reviews=?, score_social=?,
        score_composite=?, no_google_ads=?, no_meta_ads=?, pitch_note=?, raw_data=?, created_at=?
      WHERE place_id=? AND search_key=?
    `).run(
      lead.businessName, lead.category, lead.address, lead.phone, lead.website,
      lead.rating, lead.reviewCount, lead.latitude, lead.longitude,
      lead.zipCode, lead.isHispanicZip ? 1 : 0,
      lead.ownerName, lead.ownerTitle, lead.ownerEmail,
      lead.scores.digitalAds, lead.scores.competitorAds, lead.scores.website,
      lead.scores.reviews, lead.scores.social, lead.scores.composite,
      lead.noGoogleAds ? 1 : 0, lead.noMetaAds ? 1 : 0,
      lead.pitchNote, JSON.stringify(lead.rawData), Date.now(),
      lead.placeId, searchKey
    );
  } else {
    database.prepare(`
      INSERT INTO cached_leads
        (place_id, search_key, business_name, category, address, phone, website, rating, review_count,
         latitude, longitude, zip_code, is_hispanic_zip, owner_name, owner_title, owner_email,
         score_digital_ads, score_competitor_ads, score_website, score_reviews, score_social,
         score_composite, no_google_ads, no_meta_ads, pitch_note, raw_data, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      lead.placeId, searchKey, lead.businessName, lead.category, lead.address,
      lead.phone, lead.website, lead.rating, lead.reviewCount,
      lead.latitude, lead.longitude, lead.zipCode, lead.isHispanicZip ? 1 : 0,
      lead.ownerName, lead.ownerTitle, lead.ownerEmail,
      lead.scores.digitalAds, lead.scores.competitorAds, lead.scores.website,
      lead.scores.reviews, lead.scores.social, lead.scores.composite,
      lead.noGoogleAds ? 1 : 0, lead.noMetaAds ? 1 : 0,
      lead.pitchNote, JSON.stringify(lead.rawData), Date.now()
    );
  }
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
    isHispanicZip: row.is_hispanic_zip === 1,
    ownerName: row.owner_name,
    ownerTitle: row.owner_title,
    ownerEmail: row.owner_email,
    scores: {
      digitalAds: row.score_digital_ads,
      competitorAds: row.score_competitor_ads,
      website: row.score_website,
      reviews: row.score_reviews,
      social: row.score_social,
      composite: row.score_composite,
    },
    noGoogleAds: row.no_google_ads === 1,
    noMetaAds: row.no_meta_ads === 1,
    pitchNote: row.pitch_note,
    rawData: row.raw_data ? JSON.parse(row.raw_data) : {},
    cachedAt: row.created_at,
  };
}

module.exports = { initDb, getCachedLeads, saveLead, rowToLead };
