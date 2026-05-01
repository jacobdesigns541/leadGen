const axios = require('axios');
const franc = require('franc');

const STRONG_PHRASES = [
  'se habla español', 'hablamos español', 'en español',
  'atención en español', 'atencion en español',
];

// Broad Spanish-language keywords for keyword scan
const SPANISH_KEYWORDS = [
  'bienvenidos', 'nosotros', 'servicios', 'llámenos', 'llamenos', 'llame',
  'se habla español', 'hablamos español', 'en español', 'atención en español',
  'comuníquese', 'comuniquese', 'contáctenos', 'contactenos',
  'ofrecemos', 'nuestros', 'precios', 'gratis', 'consulta gratis',
];

// Words commonly found in Hispanic-owned LA business names
const NAME_SPANISH_WORDS = [
  'familia', 'grupo', 'casa', 'servicios', 'bienvenidos',
  'hermanos', 'nueva', 'buena', 'feliz', 'estrella',
  'sol', 'luna', 'tierra', 'rio', 'plaza',
];

async function fetchHispanicWebsite(url) {
  if (!url) return null;
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const response = await axios.get(normalized, {
      timeout: 8000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Mozilla/5.0 (Windows NT 10.0; Win64; x64))',
      },
      maxRedirects: 5,
    });
    return typeof response.data === 'string' ? response.data : null;
  } catch {
    return null;
  }
}

// Returns true if franc detects the text as Spanish (ISO 639-3: 'spa').
// Requires minimum 60 chars for reliability.
function isSpanish(text) {
  if (!text || text.length < 60) return false;
  return franc(text, { minLength: 20 }) === 'spa';
}

function extractVisibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

function analyzeHispanicFit({ business, html, adSnippets = [], socialSnippets = [], isHispanicZip = false }) {
  const signals = [];
  let points = 0;

  // ── Website signals ──────────────────────────────────────────────────────────
  if (html) {
    const htmlLower = html.toLowerCase();
    const visibleText = extractVisibleText(html);

    // franc language detection on visible text
    if (isSpanish(visibleText)) {
      signals.push({ key: 'ws_lang', found: true, label: 'Spanish language detected on website' });
      points += 3;
    } else {
      signals.push({ key: 'ws_lang', found: false, label: 'Spanish language detected on website' });
    }

    // lang="es" or hreflang="es" HTML attributes
    if (/lang\s*=\s*["']?es\b/i.test(html) || /hreflang\s*=\s*["']?es\b/i.test(html)) {
      signals.push({ key: 'ws_lang_attr', found: true, label: 'lang="es" or hreflang="es" attribute found' });
      points += 2;
    } else {
      signals.push({ key: 'ws_lang_attr', found: false, label: 'lang="es" or hreflang="es" attribute found' });
    }

    // "Se habla español" or equivalent strong phrase
    const matchedPhrase = STRONG_PHRASES.find((p) => htmlLower.includes(p));
    if (matchedPhrase) {
      signals.push({ key: 'ws_se_habla', found: true, label: `"${matchedPhrase}" found on website` });
      points += 3;
    } else {
      signals.push({ key: 'ws_se_habla', found: false, label: '"Se habla español" or equivalent found on website' });
    }

    // Spanish keywords in title / headings
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const headingMatches = [...html.matchAll(/<h[123][^>]*>([\s\S]*?)<\/h[123]>/gi)];
    const headingText = [
      titleMatch ? titleMatch[1] : '',
      ...headingMatches.map((m) => m[1]),
    ]
      .join(' ')
      .toLowerCase()
      .replace(/<[^>]+>/g, ' ');

    const headingKeyword = SPANISH_KEYWORDS.find((k) => headingText.includes(k));
    if (headingKeyword) {
      signals.push({ key: 'ws_headings', found: true, label: `Spanish keyword in title/headings ("${headingKeyword}")` });
      points += 2;
    } else {
      signals.push({ key: 'ws_headings', found: false, label: 'Spanish keywords in page title or headings' });
    }

    // Language toggle link/button containing "español" or "spanish"
    const hasToggle =
      /<a[^>]*>[\s\S]{0,80}?(español|spanish)[\s\S]{0,80}?<\/a>/i.test(html) ||
      /<button[^>]*>[\s\S]{0,80}?(español|spanish)[\s\S]{0,80}?<\/button>/i.test(html);
    if (hasToggle) {
      signals.push({ key: 'ws_toggle', found: true, label: 'Language toggle (Spanish) found on website' });
      points += 2;
    } else {
      signals.push({ key: 'ws_toggle', found: false, label: 'Language toggle (Spanish) found on website' });
    }

    // /es/ path or ?lang=es in internal links
    if (/href="[^"]*\/es\/|href="[^"]*[?&]lang=es|href="[^"]*[?&]language=es/i.test(html)) {
      signals.push({ key: 'ws_es_path', found: true, label: '/es/ path or ?lang=es found in internal links' });
      points += 1;
    }

    // .mx TLD
    const websiteUrl = business.website || '';
    if (websiteUrl.includes('.mx') || websiteUrl.match(/https?:\/\/[^/]*\.mx/)) {
      signals.push({ key: 'ws_mx_tld', found: true, label: '.mx domain detected' });
      points += 1;
    }
  }

  // ── Business name signals ────────────────────────────────────────────────────
  const nameLower = (business.businessName || '').toLowerCase();
  const nameWord = NAME_SPANISH_WORDS.find((w) => nameLower.includes(w));
  if (nameWord) {
    signals.push({ key: 'name_spanish', found: true, label: `Spanish word in business name ("${nameWord}")` });
    points += 1;
  } else {
    signals.push({ key: 'name_spanish', found: false, label: 'Spanish word in business name' });
  }

  // ── Business description signals ─────────────────────────────────────────────
  const description = business.description || '';
  if (description && isSpanish(description)) {
    signals.push({ key: 'desc_spanish', found: true, label: 'Business description in Spanish' });
    points += 2;
  } else {
    signals.push({ key: 'desc_spanish', found: false, label: 'Business description in Spanish' });
  }

  // ── Review snippet signals ────────────────────────────────────────────────────
  const reviews = Array.isArray(business.reviews) ? business.reviews : [];
  if (reviews.length > 0) {
    const spanishCount = reviews.filter((r) => {
      const text = typeof r === 'string' ? r : (r.text || r.snippet || '');
      return isSpanish(text);
    }).length;
    const pct = Math.round((spanishCount / reviews.length) * 100);
    if (pct > 30) {
      signals.push({ key: 'reviews_spanish', found: true, label: `Spanish language in reviews (${pct}%)` });
      points += 3;
    } else {
      signals.push({ key: 'reviews_spanish', found: false, label: 'Spanish language in reviews (>30%)' });
    }
  }

  // ── Ad copy signals ──────────────────────────────────────────────────────────
  const adText = adSnippets.join(' ');
  const hasSpanishAd =
    isSpanish(adText) || SPANISH_KEYWORDS.some((k) => adText.toLowerCase().includes(k));
  if (hasSpanishAd) {
    signals.push({ key: 'ad_spanish', found: true, label: 'Spanish ad copy detected in search results' });
    points += 2;
  } else {
    signals.push({ key: 'ad_spanish', found: false, label: 'Spanish ad copy detected in search results' });
  }

  // ── Social media signals ─────────────────────────────────────────────────────
  const socialText = socialSnippets.join(' ');
  const hasSpanishSocial =
    isSpanish(socialText) || SPANISH_KEYWORDS.some((k) => socialText.toLowerCase().includes(k));
  if (hasSpanishSocial) {
    signals.push({ key: 'social_spanish', found: true, label: 'Spanish content detected on social media' });
    points += 2;
  } else {
    signals.push({ key: 'social_spanish', found: false, label: 'Spanish content detected on social media' });
  }

  // ── ZIP code signal ──────────────────────────────────────────────────────────
  if (isHispanicZip) {
    signals.push({ key: 'zip_hispanic', found: true, label: 'ZIP code in Hispanic majority area' });
    points += 1;
  } else {
    signals.push({ key: 'zip_hispanic', found: false, label: 'ZIP code in Hispanic majority area' });
  }

  // ── Confidence level ─────────────────────────────────────────────────────────
  let level;
  if (points >= 8)      level = 'strong';
  else if (points >= 4) level = 'possible';
  else if (points >= 1) level = 'zip-only';
  else                  level = 'none';

  console.log(`[hispanic] "${business.businessName}": points=${points} level=${level}`);
  return { points, level, signals };
}

module.exports = { fetchHispanicWebsite, analyzeHispanicFit };
