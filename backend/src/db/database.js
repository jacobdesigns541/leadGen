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
      is_hispanic_zip INTEGER DEFAULT 0,
      owner_name TEXT,
      owner_title TEXT,
      owner_email TEXT,
      score_digital_ads INTEGER DEFAULT 0,
      score_tv INTEGER DEFAULT 0,
      score_radio INTEGER DEFAULT 0,
      score_website INTEGER DEFAULT 0,
      score_reviews INTEGER DEFAULT 0,
      score_social INTEGER DEFAULT 0,
      score_composite INTEGER DEFAULT 0,
      no_google_ads INTEGER DEFAULT 0,
      no_meta_ads INTEGER DEFAULT 0,
      no_tv_ads INTEGER DEFAULT 0,
      no_radio_ads INTEGER DEFAULT 0,
      tv_stations TEXT DEFAULT '[]',
      radio_stations TEXT DEFAULT '[]',
      hispanic_data TEXT DEFAULT NULL,
      pitch_note TEXT,
      raw_data TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_place_id ON cached_leads(place_id);
    CREATE INDEX IF NOT EXISTS idx_search_key ON cached_leads(search_key);
  `);

  // Migrations for existing DBs
  try { db.run(`ALTER TABLE cached_leads ADD COLUMN tv_stations TEXT DEFAULT '[]'`); } catch (_) {}
  try { db.run(`ALTER TABLE cached_leads ADD COLUMN radio_stations TEXT DEFAULT '[]'`); } catch (_) {}
  try { db.run(`ALTER TABLE cached_leads ADD COLUMN hispanic_data TEXT DEFAULT NULL`); } catch (_) {}

  persistDb();
  console.log('Database initialized at', DB_PATH);
}

function getCachedLeads(searchKey) {
  const cutoff = Date.now() - CACHE_TTL_MS;
  return queryAll(
    'SELECT * FROM cached_leads WHERE search_key = ? AND created_at > ?',
    [searchKey, cutoff]
  );
}

function saveLead(searchKey, lead) {
  const existing = queryOne(
    'SELECT id FROM cached_leads WHERE place_id = ? AND search_key = ?',
    [lead.placeId, searchKey]
  );

  const vals = [
    lead.businessName, lead.category, lead.address, lead.phone, lead.website,
    lead.rating, lead.reviewCount, lead.latitude, lead.longitude,
    lead.zipCode, lead.isHispanicZip ? 1 : 0,
    lead.ownerName, lead.ownerTitle, lead.ownerEmail,
    lead.scores.digitalAds, lead.scores.tv, lead.scores.radio,
    lead.scores.website, lead.scores.reviews, lead.scores.social, lead.scores.composite,
    lead.noGoogleAds ? 1 : 0, lead.noMetaAds ? 1 : 0,
    lead.noTvAds ? 1 : 0, lead.noRadioAds ? 1 : 0,
    JSON.stringify(lead.tvStations || []), JSON.stringify(lead.radioStations || []),
    lead.hispanicFit ? JSON.stringify(lead.hispanicFit) : null,
    lead.pitchNote, JSON.stringify(lead.rawData), Date.now(),
  ];

  if (existing) {
    db.run(`
      UPDATE cached_leads SET
        business_name=?, category=?, address=?, phone=?, website=?, rating=?, review_count=?,
        latitude=?, longitude=?, zip_code=?, is_hispanic_zip=?,
        owner_name=?, owner_title=?, owner_email=?,
        score_digital_ads=?, score_tv=?, score_radio=?,
        score_website=?, score_reviews=?, score_social=?, score_composite=?,
        no_google_ads=?, no_meta_ads=?, no_tv_ads=?, no_radio_ads=?,
        tv_stations=?, radio_stations=?, hispanic_data=?,
        pitch_note=?, raw_data=?, created_at=?
      WHERE place_id=? AND search_key=?
    `, [...vals, lead.placeId, searchKey]);
  } else {
    db.run(`
      INSERT INTO cached_leads
        (place_id, search_key, business_name, category, address, phone, website, rating, review_count,
         latitude, longitude, zip_code, is_hispanic_zip, owner_name, owner_title, owner_email,
         score_digital_ads, score_tv, score_radio, score_website, score_reviews, score_social,
         score_composite, no_google_ads, no_meta_ads, no_tv_ads, no_radio_ads,
         tv_stations, radio_stations, hispanic_data, pitch_note, raw_data, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [lead.placeId, searchKey, ...vals]);
  }

  persistDb();
}

function getCacheStats() {
  return queryOne('SELECT COUNT(*) as total, MAX(created_at) as last_updated FROM cached_leads');
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
      tv:         row.score_tv,
      radio:      row.score_radio,
      website:    row.score_website,
      reviews:    row.score_reviews,
      social:     row.score_social,
      composite:  row.score_composite,
    },
    noGoogleAds:    row.no_google_ads === 1,
    noMetaAds:      row.no_meta_ads === 1,
    noTvAds:        row.no_tv_ads === 1,
    noRadioAds:     row.no_radio_ads === 1,
    tvStations:     row.tv_stations ? JSON.parse(row.tv_stations) : [],
    radioStations:  row.radio_stations ? JSON.parse(row.radio_stations) : [],
    hispanicFit:    row.hispanic_data ? JSON.parse(row.hispanic_data) : null,
    pitchNote:      row.pitch_note,
    rawData:      row.raw_data ? JSON.parse(row.raw_data) : {},
    cachedAt:     row.created_at,
  };
}

module.exports = { initDb, getCachedLeads, saveLead, getCacheStats, rowToLead };
