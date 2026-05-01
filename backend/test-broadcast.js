#!/usr/bin/env node
// Standalone test for TV / Radio broadcast detection
// Usage: node test-broadcast.js [businessName]
// Requires SERPER_API_KEY in environment (or ../.env / .env)

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const axios = require('axios');

// ─── Constants mirrored from fccApi.js ───────────────────────────────────────

const SERPER_BASE = 'https://google.serper.dev/search';

const CALLSIGN_RE = /\b([KW][A-Z]{2,3})\b/g;
const FREQ_RE     = /\b(\d{2,3}\.\d\s?FM|\d{3,4}\s?AM)\b/gi;

const AD_KEYWORDS = [
  'commercial', 'advertisement', 'advertise', 'sponsor',
  'on-air', 'on air', ' ad ', 'spot', 'campaign',
];

const NETWORK_CONTEXT = ['NBC', 'CBS', 'ABC', 'Fox', 'Univision', 'Telemundo', 'CNN', 'ESPN'];

const PLATFORM_DOMAINS = {
  'iheartradio.com': 'iHeart Radio',
  'spotify.com':     'Spotify',
  'pandora.com':     'Pandora',
  'tunein.com':      'TuneIn',
  'youtube.com':     'YouTube Ad',
  'univision.com':   'Univision',
  'telemundo.com':   'Telemundo',
};

const CALLSIGN_TO_NETWORK = {
  KNBC: 'NBC', KCBS: 'CBS', KABC: 'ABC', KTTV: 'Fox',
  KTNQ: 'Telemundo', KVEA: 'Telemundo', KMEX: 'Univision',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasAdKeyword(text) {
  return AD_KEYWORDS.some((kw) => text.includes(kw));
}

function extractTagsFromResult(result, businessName) {
  const title   = result.title   || '';
  const snippet = result.snippet || '';
  const link    = (result.link   || '').toLowerCase();
  const titleSnippet      = `${title} ${snippet}`;
  const titleSnippetLower = titleSnippet.toLowerCase();

  if (!titleSnippetLower.includes(businessName.toLowerCase())) return [];

  const adContext = hasAdKeyword(titleSnippetLower);
  const tags      = new Set();

  for (const [domain, label] of Object.entries(PLATFORM_DOMAINS)) {
    if (link.includes(domain)) tags.add(label);
  }

  if (adContext || tags.size > 0) {
    const callSigns = [...titleSnippet.matchAll(CALLSIGN_RE)].map((m) => m[1]);
    const freqs     = [...titleSnippet.matchAll(FREQ_RE)].map((m) => m[1].replace(/\s/, '').toUpperCase());
    for (const cs of callSigns) {
      const paired = freqs.find(() => titleSnippetLower.includes(cs.toLowerCase()));
      tags.add(paired ? `${cs} ${paired}` : cs);
    }
  }

  if (adContext) {
    for (const network of NETWORK_CONTEXT) {
      if (new RegExp(`\\b${network}\\b`, 'i').test(titleSnippet)) tags.add(network);
    }
  }

  if (adContext) {
    const callSigns = [...titleSnippet.matchAll(CALLSIGN_RE)].map((m) => m[1]);
    if (callSigns.length === 0) {
      const freqs = [...titleSnippet.matchAll(FREQ_RE)].map((m) => m[1].replace(/\s/, '').toUpperCase());
      for (const f of freqs) tags.add(f);
    }
  }

  return [...tags];
}

function deduplicateTags(rawTags) {
  let tags = [...new Set(rawTags)];
  const detectedCallSigns = tags.filter((t) => /^[KW][A-Z]{2,3}/.test(t));
  const networksToRemove  = new Set();
  for (const cs of detectedCallSigns) {
    const network = CALLSIGN_TO_NETWORK[cs];
    if (network) networksToRemove.add(network);
  }
  tags = tags.filter((t) => !networksToRemove.has(t));
  tags = tags.filter((tag) => {
    const isBareCallSign = /^[KW][A-Z]{2,3}$/.test(tag);
    return !isBareCallSign || !tags.some((t) => t !== tag && t.startsWith(tag + ' '));
  });
  return tags;
}

function scoreResults(organic, businessName) {
  if (!organic || organic.length === 0) return { level: 0, hasEvidence: false, tags: [], evidence: [] };

  const nameLower = businessName.toLowerCase();
  let mentionCount  = 0;
  let strongEvidence = false;
  const allTags = [];
  const evidence = [];

  for (const result of organic) {
    const title   = (result.title   || '').toLowerCase();
    const snippet = (result.snippet || '').toLowerCase();
    const link    = (result.link    || '').toLowerCase();
    const combined = `${title} ${snippet} ${link}`;

    const mentionsBusiness = combined.includes(nameLower);
    const adCtx   = hasAdKeyword(combined);
    const hasDomain = Object.keys(PLATFORM_DOMAINS).some((d) => link.includes(d));

    if (!mentionsBusiness || (!adCtx && !hasDomain)) continue;

    mentionCount++;
    if (hasDomain || adCtx) strongEvidence = true;

    const tags = extractTagsFromResult(result, businessName);
    allTags.push(...tags);

    evidence.push({
      title: result.title,
      snippet: result.snippet,
      link: result.link,
      adContext: adCtx,
      platformDomain: hasDomain ? Object.keys(PLATFORM_DOMAINS).find((d) => link.includes(d)) : null,
      tagsFound: tags,
    });
  }

  const hasEvidence = mentionCount > 0;
  let level;
  if (!hasEvidence)                             level = 0;
  else if (strongEvidence && mentionCount >= 2) level = 3;
  else if (strongEvidence || mentionCount >= 2) level = 2;
  else                                          level = 1;

  return { level, hasEvidence, mentionCount, tags: deduplicateTags(allTags), evidence };
}

function levelToScore(level) {
  const MID = [0, 6, 11, 17]; // deterministic midpoints for testing
  return MID[level] ?? 0;
}

// ─── Serper call ─────────────────────────────────────────────────────────────

async function serperSearch(query) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.error('\n❌  SERPER_API_KEY is not set. Set it in the environment or a .env file.\n');
    process.exit(1);
  }
  const response = await axios.post(
    SERPER_BASE,
    { q: query, gl: 'us', location: 'Los Angeles, California, United States' },
    {
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      timeout: 10000,
    }
  );
  return response.data;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const HR  = '─'.repeat(72);
const HR2 = '━'.repeat(72);

function printRaw(label, data) {
  console.log(`\n${HR}`);
  console.log(`  RAW RESPONSE: ${label}`);
  console.log(HR);
  const organic = data?.organic || [];
  const ads     = data?.ads     || [];
  console.log(`  organic results: ${organic.length}  |  ads: ${ads.length}`);
  organic.forEach((r, i) => {
    console.log(`\n  [${i + 1}] ${r.title}`);
    console.log(`       ${r.link}`);
    if (r.snippet) console.log(`       ${r.snippet}`);
  });
  if (ads.length) {
    console.log('\n  — Ads —');
    ads.forEach((a, i) => {
      console.log(`\n  [ad ${i + 1}] ${a.title}`);
      console.log(`           ${a.link}`);
      if (a.snippet) console.log(`           ${a.snippet}`);
    });
  }
}

function printPatternMatches(label, organic, businessName) {
  console.log(`\n${HR}`);
  console.log(`  PATTERN MATCHES: ${label}`);
  console.log(HR);

  for (const r of organic) {
    const ts = `${r.title || ''} ${r.snippet || ''}`;
    const tsLower = ts.toLowerCase();
    const link = (r.link || '').toLowerCase();

    const mentions = tsLower.includes(businessName.toLowerCase());
    const adCtx    = hasAdKeyword(tsLower);
    const callSigns = [...ts.matchAll(CALLSIGN_RE)].map((m) => m[1]);
    const freqs     = [...ts.matchAll(FREQ_RE)].map((m) => m[1].replace(/\s/, '').toUpperCase());
    const networks  = NETWORK_CONTEXT.filter((n) => new RegExp(`\\b${n}\\b`, 'i').test(ts));
    const platforms = Object.keys(PLATFORM_DOMAINS).filter((d) => link.includes(d));

    const relevant = mentions && (adCtx || platforms.length > 0);
    if (!relevant) continue;

    console.log(`\n  ▸ "${r.title?.slice(0, 65)}"`);
    console.log(`    mentions business : ${mentions ? '✓' : '✗'}`);
    console.log(`    ad keyword found  : ${adCtx ? '✓  (' + AD_KEYWORDS.filter(k => tsLower.includes(k)).join(', ') + ')' : '✗'}`);
    console.log(`    call signs        : ${callSigns.length ? callSigns.join(', ') : '—'}`);
    console.log(`    frequencies       : ${freqs.length ? freqs.join(', ') : '—'}`);
    console.log(`    network names     : ${networks.length ? networks.join(', ') : '—'}`);
    console.log(`    platform domains  : ${platforms.length ? platforms.map(d => `${d} → ${PLATFORM_DOMAINS[d]}`).join(', ') : '—'}`);
  }
}

function printEvidence(evidence) {
  console.log('\n  Evidence items (would appear in "View evidence" on the card):');
  if (evidence.length === 0) {
    console.log('  (none)');
    return;
  }
  evidence.forEach((ev, i) => {
    console.log(`\n  [${i + 1}] ${ev.title}`);
    console.log(`       ${ev.link}`);
    if (ev.snippet) console.log(`       "${ev.snippet}"`);
    console.log(`       ad-context: ${ev.adContext ? 'yes' : 'no'}${ev.platformDomain ? `  |  platform: ${PLATFORM_DOMAINS[ev.platformDomain]}` : ''}`);
    if (ev.tagsFound.length) console.log(`       tags extracted: ${ev.tagsFound.join(', ')}`);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const businessName = process.argv[2] || 'Kars4Kids';

  console.log(`\n${HR2}`);
  console.log(`  BROADCAST DETECTION TEST  —  "${businessName}"`);
  console.log(HR2);

  const tvQueries = [
    `"${businessName}" television commercial Los Angeles KABC KNBC KCBS KTTV KTLA KCAL`,
    `"${businessName}" TV spot advertisement Los Angeles`,
  ];
  const radioQueries = [
    `"${businessName}" radio commercial Los Angeles KLAX KBUE KSCA KRRL KPWR KIIS`,
    `"${businessName}" radio sponsor advertisement Los Angeles site:iheartradio.com OR site:spotify.com`,
  ];

  console.log('\nRunning 4 Serper queries in parallel…');

  let [tvD1, tvD2, rdD1, rdD2] = [null, null, null, null];
  try {
    [tvD1, tvD2, rdD1, rdD2] = await Promise.all([
      serperSearch(tvQueries[0]),
      serperSearch(tvQueries[1]),
      serperSearch(radioQueries[0]),
      serperSearch(radioQueries[1]),
    ]);
  } catch (err) {
    console.error('\n❌  Serper request failed:', err.message);
    process.exit(1);
  }

  // ── Raw responses ───────────────────────────────────────────────────────────
  printRaw(`TV query 1: ${tvQueries[0]}`, tvD1);
  printRaw(`TV query 2: ${tvQueries[1]}`, tvD2);
  printRaw(`Radio query 1: ${radioQueries[0]}`, rdD1);
  printRaw(`Radio query 2: ${radioQueries[1]}`, rdD2);

  // ── Pattern matches ─────────────────────────────────────────────────────────
  const tvOrganic    = [...(tvD1?.organic || []), ...(tvD2?.organic || [])];
  const radioOrganic = [...(rdD1?.organic || []), ...(rdD2?.organic || [])];

  printPatternMatches('TV', tvOrganic, businessName);
  printPatternMatches('Radio', radioOrganic, businessName);

  // ── Scoring ─────────────────────────────────────────────────────────────────
  const tvResult    = scoreResults(tvOrganic,    businessName);
  const radioResult = scoreResults(radioOrganic, businessName);

  const tvScore    = levelToScore(tvResult.level);
  const radioScore = levelToScore(radioResult.level);

  console.log(`\n${HR2}`);
  console.log('  FINAL SCORES & TAGS');
  console.log(HR2);

  console.log(`\n  TV`);
  console.log(`    evidence level  : ${tvResult.level}  (0=none, 1=weak, 2=moderate, 3=strong)`);
  console.log(`    mentions found  : ${tvResult.mentionCount}`);
  console.log(`    score (0–20)    : ${tvScore}`);
  console.log(`    station tags    : ${tvResult.tags.length ? tvResult.tags.join(', ') : '(none)'}`);
  printEvidence(tvResult.evidence);

  console.log(`\n  Radio`);
  console.log(`    evidence level  : ${radioResult.level}  (0=none, 1=weak, 2=moderate, 3=strong)`);
  console.log(`    mentions found  : ${radioResult.mentionCount}`);
  console.log(`    score (0–20)    : ${radioScore}`);
  console.log(`    station tags    : ${radioResult.tags.length ? radioResult.tags.join(', ') : '(none)'}`);
  printEvidence(radioResult.evidence);

  console.log(`\n${HR2}\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
