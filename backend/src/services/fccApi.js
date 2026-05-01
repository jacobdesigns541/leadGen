const axios = require('axios');

const SERPER_BASE = 'https://google.serper.dev/search';

// Matches US broadcast call signs: K or W followed by 2-3 uppercase letters
const CALLSIGN_RE = /\b([KW][A-Z]{2,3})\b/g;

// Matches common broadcast frequencies
const FREQ_RE = /\b(\d{2,3}\.\d\s?FM|\d{3,4}\s?AM)\b/gi;

// Ad-context keywords — a call sign or network must appear near one of these
const AD_KEYWORDS = ['commercial', 'advertisement', 'advertise', 'sponsor', 'on-air', 'on air', ' ad ', 'spot', 'campaign'];

// Known network names: only tagged when co-occurring with an ad keyword
const NETWORK_CONTEXT = ['NBC', 'CBS', 'ABC', 'Fox', 'Univision', 'Telemundo', 'CNN', 'ESPN'];

// Platform domains → display label (matched against result URL)
const PLATFORM_DOMAINS = {
  'iheartradio.com': 'iHeart Radio',
  'spotify.com':     'Spotify',
  'pandora.com':     'Pandora',
  'tunein.com':      'TuneIn',
  'youtube.com':     'YouTube Ad',
  'univision.com':   'Univision',
  'telemundo.com':   'Telemundo',
};

// When a call sign is known to match a network, prefer the call sign
const CALLSIGN_TO_NETWORK = {
  KNBC: 'NBC', KCBS: 'CBS', KABC: 'ABC', KTTV: 'Fox',
  KTNQ: 'Telemundo', KVEA: 'Telemundo', KMEX: 'Univision',
};

async function serperSearch(query) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await axios.post(
      SERPER_BASE,
      { q: query, gl: 'us', location: 'Los Angeles, California, United States' },
      {
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (err) {
    console.error(`[broadcast] Serper error for "${query}": ${err.message}`);
    return null;
  }
}

function hasAdKeyword(text) {
  return AD_KEYWORDS.some((kw) => text.includes(kw));
}

// Extract tags from a single organic result.
// Requires the business name to appear in title/snippet (contextual link).
function extractTagsFromResult(result, businessName) {
  const title   = result.title   || '';
  const snippet = result.snippet || '';
  const link    = (result.link   || '').toLowerCase();

  const titleSnippet      = `${title} ${snippet}`;
  const titleSnippetLower = titleSnippet.toLowerCase();

  // Hard requirement: business name must appear in this result's text
  if (!titleSnippetLower.includes(businessName.toLowerCase())) return [];

  const adContext = hasAdKeyword(titleSnippetLower);
  const tags      = new Set();

  // --- Platform domains (URL match — platform domain alone is sufficient context) ---
  for (const [domain, label] of Object.entries(PLATFORM_DOMAINS)) {
    if (link.includes(domain)) tags.add(label);
  }

  // --- Call signs (only valid with ad context OR platform domain already found) ---
  if (adContext || tags.size > 0) {
    const callSigns = [...titleSnippet.matchAll(CALLSIGN_RE)].map((m) => m[1]);
    const freqs     = [...titleSnippet.matchAll(FREQ_RE)].map((m) => m[1].replace(/\s/, '').toUpperCase());

    for (const cs of callSigns) {
      // Try to pair call sign with a frequency from the same text
      const paired = freqs.find((f) => titleSnippetLower.includes(cs.toLowerCase()) && titleSnippetLower.includes(f.toLowerCase()));
      tags.add(paired ? `${cs} ${paired}` : cs);
    }
  }

  // --- Broadcast network names (only with explicit ad context) ---
  if (adContext) {
    for (const network of NETWORK_CONTEXT) {
      if (new RegExp(`\\b${network}\\b`, 'i').test(titleSnippet)) {
        tags.add(network);
      }
    }
  }

  // --- Standalone frequency patterns (only with ad context AND a call sign nearby) ---
  if (adContext) {
    const callSigns = [...titleSnippet.matchAll(CALLSIGN_RE)].map((m) => m[1]);
    if (callSigns.length === 0) {
      // No call sign — look for bare frequency as a weaker signal
      const freqs = [...titleSnippet.matchAll(FREQ_RE)].map((m) => m[1].replace(/\s/, '').toUpperCase());
      for (const f of freqs) tags.add(f);
    }
  }

  return [...tags];
}

// Deduplicate tags collected across all results.
// Rules:
//   - If "KNBC" and "NBC" both present → remove "NBC" (call sign is more specific)
//   - If "KLAX" and "KLAX 97.9FM" both present → remove bare "KLAX"
function deduplicateTags(rawTags) {
  let tags = [...new Set(rawTags)];

  // Remove network names superseded by a matching call sign
  const detectedCallSigns = tags.filter((t) => /^[KW][A-Z]{2,3}/.test(t));
  const networksToRemove  = new Set();
  for (const cs of detectedCallSigns) {
    const network = CALLSIGN_TO_NETWORK[cs];
    if (network) networksToRemove.add(network);
  }
  tags = tags.filter((t) => !networksToRemove.has(t));

  // Remove bare call signs when a "CALL freq" variant exists
  tags = tags.filter((tag) => {
    const isBareCallSign = /^[KW][A-Z]{2,3}$/.test(tag);
    return !isBareCallSign || !tags.some((t) => t !== tag && t.startsWith(tag + ' '));
  });

  return tags;
}

function scoreResults(organic, businessName) {
  if (!organic || organic.length === 0) return { level: 0, hasEvidence: false, tags: [] };

  const nameLower = businessName.toLowerCase();
  let mentionCount  = 0;
  let strongEvidence = false;
  const allTags     = [];

  for (const result of organic) {
    const title   = (result.title   || '').toLowerCase();
    const snippet = (result.snippet || '').toLowerCase();
    const link    = (result.link    || '').toLowerCase();
    const combined = `${title} ${snippet} ${link}`;

    const mentionsBusiness = combined.includes(nameLower);
    const adCtx = hasAdKeyword(combined);
    const hasDomain = Object.keys(PLATFORM_DOMAINS).some((d) => link.includes(d));

    if (!mentionsBusiness || (!adCtx && !hasDomain)) continue;

    mentionCount++;
    if (hasDomain || adCtx) strongEvidence = true;

    allTags.push(...extractTagsFromResult(result, businessName));
  }

  const hasEvidence = mentionCount > 0;
  let level;
  if (!hasEvidence)                          level = 0; // 0-3
  else if (strongEvidence && mentionCount >= 2) level = 3; // 15-20
  else if (strongEvidence || mentionCount >= 2) level = 2; // 9-14
  else                                          level = 1; // 4-8

  return { level, hasEvidence, mentionCount, tags: deduplicateTags(allTags) };
}

function levelToScore(level) {
  switch (level) {
    case 0: return Math.floor(Math.random() * 4);       // 0-3
    case 1: return 4  + Math.floor(Math.random() * 5); // 4-8
    case 2: return 9  + Math.floor(Math.random() * 6); // 9-14
    case 3: return 15 + Math.floor(Math.random() * 6); // 15-20
    default: return 0;
  }
}

async function checkTvPresence(businessName) {
  const [d1, d2] = await Promise.all([
    serperSearch(`"${businessName}" television commercial Los Angeles KABC KNBC KCBS KTTV KTLA KCAL`),
    serperSearch(`"${businessName}" TV spot advertisement Los Angeles`),
  ]);
  const organic = [...(d1?.organic || []), ...(d2?.organic || [])];
  const { level, hasEvidence, mentionCount, tags } = scoreResults(organic, businessName);
  const score = levelToScore(level);
  console.log(`[broadcast] TV "${businessName}": level=${level} mentions=${mentionCount} tags=${JSON.stringify(tags)} score=${score}`);
  return { score, hasEvidence, detectedTags: tags, type: 'tv' };
}

async function checkRadioPresence(businessName) {
  const [d1, d2] = await Promise.all([
    serperSearch(`"${businessName}" radio commercial Los Angeles KLAX KBUE KSCA KRRL KPWR KIIS`),
    serperSearch(`"${businessName}" radio sponsor advertisement Los Angeles site:iheartradio.com OR site:spotify.com`),
  ]);
  const organic = [...(d1?.organic || []), ...(d2?.organic || [])];
  const { level, hasEvidence, mentionCount, tags } = scoreResults(organic, businessName);
  const score = levelToScore(level);
  console.log(`[broadcast] Radio "${businessName}": level=${level} mentions=${mentionCount} tags=${JSON.stringify(tags)} score=${score}`);
  return { score, hasEvidence, detectedTags: tags, type: 'radio' };
}

module.exports = { checkTvPresence, checkRadioPresence };
