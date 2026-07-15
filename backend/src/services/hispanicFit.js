const franc = require('franc');

const HISPANIC_ZIPS = new Set([
  '90022', '90023', '90033', '90063', '90255', '90270', '90280', '90262',
  '90044', '90003', '90011', '90058', '90640', '91030', '91733', '91401',
  '91405', '91340', '90650', '90706', '90723',
]);

const STRONG_PHRASES = ['se habla español', 'hablamos español', 'atención en español', 'atencion en español'];
const TITLE_KEYWORDS = ['bienvenidos', 'nosotros', 'servicios', 'llámenos', 'llamenos', 'ofrecemos'];
const BROADCAST_ES_PHRASES = ['comercial de', 'en la television', 'en la radio'];
const NAME_WORDS = ['familia', 'grupo', 'hermanos', 'nueva', 'estrella', 'sol', 'plaza', 'casa', 'feliz', 'buena'];

function isSpanish(text) {
  if (!text || text.length < 60) return false;
  try {
    return franc(text, { minLength: 20 }) === 'spa';
  } catch {
    return false;
  }
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

function analyzeHispanicFit({ business, html, htmlAvailable, zipCode }) {
  const signals = [];
  let points = 0;

  if (htmlAvailable && html) {
    const htmlLower = html.toLowerCase();
    const visibleText = extractVisibleText(html);

    if (STRONG_PHRASES.some((p) => htmlLower.includes(p))) {
      signals.push('Website mentions "se habla español" / "atención en español"');
      points += 3;
    }

    if (/lang\s*=\s*["']?es\b/i.test(html) || /hreflang\s*=\s*["']?es\b/i.test(html)) {
      signals.push('lang="es" or hreflang="es" attribute found');
      points += 2;
    }

    if (isSpanish(visibleText)) {
      signals.push('Spanish language detected in website body text');
      points += 3;
    }

    const hasToggle =
      /<a[^>]*>[\s\S]{0,80}?(español|spanish)[\s\S]{0,80}?<\/a>/i.test(html) ||
      /<button[^>]*>[\s\S]{0,80}?(español|spanish)[\s\S]{0,80}?<\/button>/i.test(html);
    if (hasToggle) {
      signals.push('Language toggle (Spanish) found on website');
      points += 2;
    }

    if (/href=["'][^"']*\/es\//i.test(html) || /href=["'][^"']*[?&]lang=es/i.test(html)) {
      signals.push('/es/ path or ?lang=es found in internal links');
      points += 2;
    }

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
    const headingText = [titleMatch ? titleMatch[1] : '', ...h1Matches.map((m) => m[1])]
      .join(' ')
      .toLowerCase()
      .replace(/<[^>]+>/g, ' ');
    if (TITLE_KEYWORDS.some((k) => headingText.includes(k))) {
      signals.push('Spanish keywords found in page title or H1');
      points += 2;
    }

    if (BROADCAST_ES_PHRASES.some((p) => htmlLower.includes(p))) {
      signals.push('Spanish broadcast phrase found on website');
      points += 1;
    }
  }

  const nameLower = (business.businessName || '').toLowerCase();
  if (NAME_WORDS.some((w) => nameLower.includes(w))) {
    signals.push('Business name contains a Spanish word');
    points += 1;
  }

  const description = business.description || '';
  if (description && isSpanish(description)) {
    signals.push('Business description is in Spanish');
    points += 2;
  }

  const reviews = Array.isArray(business.reviews) ? business.reviews : [];
  if (reviews.length > 0) {
    const spanishCount = reviews.filter((r) => isSpanish(typeof r === 'string' ? r : r.text || r.snippet || '')).length;
    if (spanishCount / reviews.length > 0.3) {
      signals.push('More than 30% of review snippets are in Spanish');
      points += 3;
    }
  }

  if (zipCode && HISPANIC_ZIPS.has(zipCode)) {
    signals.push('ZIP code is in a Hispanic-majority area');
    points += 1;
  }

  let level;
  if (points >= 8) level = 'strong';
  else if (points >= 4) level = 'possible';
  else if (points >= 1) level = 'zip-only';
  else level = 'none';

  return { points, level, signals };
}

module.exports = { analyzeHispanicFit, HISPANIC_ZIPS };
