const axios = require('axios');

const SERPER_BASE = 'https://google.serper.dev/search';

const TV_CALL_SIGNS = ['KABC', 'KNBC', 'KCBS', 'KTTV', 'KTLA', 'KCAL'];
const RADIO_CALL_SIGNS = ['KLAX', 'KBUE', 'KSCA', 'KRRL', 'KPWR', 'KIIS'];

const TV_KEYWORDS = [
  'commercial', 'advertisement', 'sponsor', 'tv spot', 'television',
  ...TV_CALL_SIGNS.map((s) => s.toLowerCase()),
];

const RADIO_KEYWORDS = [
  'radio', 'on-air', 'on air', 'sponsor', 'advertisement',
  ...RADIO_CALL_SIGNS.map((s) => s.toLowerCase()),
];

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
    console.error(`[broadcast] Serper search error for "${query}": ${err.message}`);
    return null;
  }
}

function scoreResults(organic, keywords, businessName) {
  if (!organic || organic.length === 0) return { level: 0, hasEvidence: false };

  const nameLower = businessName.toLowerCase();

  let mentionCount = 0;
  let directEvidence = false;
  let strongEvidence = false;

  for (const result of organic) {
    const title = (result.title || '').toLowerCase();
    const snippet = (result.snippet || '').toLowerCase();
    const link = (result.link || '').toLowerCase();

    const combined = `${title} ${snippet} ${link}`;
    const hasKeyword = keywords.some((kw) => combined.includes(kw));
    const mentionsBusiness = combined.includes(nameLower);

    if (!hasKeyword || !mentionsBusiness) continue;

    mentionCount++;

    // Strong evidence: station/iHeart/Spotify page, or YouTube commercial
    const isAuthoritativeSource =
      TV_CALL_SIGNS.some((s) => link.includes(s.toLowerCase())) ||
      RADIO_CALL_SIGNS.some((s) => link.includes(s.toLowerCase())) ||
      link.includes('iheartradio.com') ||
      link.includes('spotify.com') ||
      (link.includes('youtube.com') && combined.includes('commercial'));

    if (isAuthoritativeSource) strongEvidence = true;
    if (mentionCount >= 2) directEvidence = true;
  }

  const hasEvidence = mentionCount > 0;
  let level;
  if (!hasEvidence) {
    level = 0; // no signal → 0-3
  } else if (strongEvidence || mentionCount >= 3) {
    level = 3; // multiple/authoritative → 15-20
  } else if (directEvidence || mentionCount === 2) {
    level = 2; // station/news confirms → 9-14
  } else {
    level = 1; // mention but no direct evidence → 4-8
  }

  return { level, hasEvidence, mentionCount };
}

function levelToScore(level) {
  switch (level) {
    case 0: return Math.floor(Math.random() * 4);        // 0-3
    case 1: return 4 + Math.floor(Math.random() * 5);   // 4-8
    case 2: return 9 + Math.floor(Math.random() * 6);   // 9-14
    case 3: return 15 + Math.floor(Math.random() * 6);  // 15-20
    default: return 0;
  }
}

async function checkTvPresence(businessName) {
  const [data1, data2] = await Promise.all([
    serperSearch(`"${businessName}" television commercial Los Angeles KABC KNBC KCBS KTTV KTLA KCAL`),
    serperSearch(`"${businessName}" TV spot advertisement Los Angeles`),
  ]);

  const organic = [
    ...(data1?.organic || []),
    ...(data2?.organic || []),
  ];

  const { level, hasEvidence, mentionCount } = scoreResults(organic, TV_KEYWORDS, businessName);
  const score = levelToScore(level);

  console.log(`[broadcast] TV "${businessName}": level=${level} mentions=${mentionCount} score=${score}`);
  return { score, hasEvidence, stationsFound: mentionCount, type: 'tv' };
}

async function checkRadioPresence(businessName) {
  const [data1, data2] = await Promise.all([
    serperSearch(`"${businessName}" radio commercial Los Angeles KLAX KBUE KSCA KRRL KPWR KIIS`),
    serperSearch(`"${businessName}" radio sponsor advertisement Los Angeles site:iheartradio.com OR site:spotify.com`),
  ]);

  const organic = [
    ...(data1?.organic || []),
    ...(data2?.organic || []),
  ];

  const { level, hasEvidence, mentionCount } = scoreResults(organic, RADIO_KEYWORDS, businessName);
  const score = levelToScore(level);

  console.log(`[broadcast] Radio "${businessName}": level=${level} mentions=${mentionCount} score=${score}`);
  return { score, hasEvidence, stationsFound: mentionCount, type: 'radio' };
}

module.exports = { checkTvPresence, checkRadioPresence };
