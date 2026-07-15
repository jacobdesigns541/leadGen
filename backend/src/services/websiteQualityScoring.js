// Low score = weak/no website = underperforming = good lead signal.
// High score = modern, fully tracked, optimized site = already well served on this channel.
function scoreWebsiteQuality({ hasWebsiteUrl, htmlAvailable, html, isHttps }) {
  if (!hasWebsiteUrl) {
    return {
      score: 2, // No website at all: 1-2 pts
      signals: { hasWebsite: false, reachable: false, mobileResponsive: false, hasPixels: false, lastUpdatedYear: null },
      notes: ['No website found'],
    };
  }

  if (!htmlAvailable) {
    return {
      score: 3, // Unreachable — worse than "outdated but live", still above the no-website floor
      signals: { hasWebsite: true, reachable: false, mobileResponsive: false, hasPixels: false, lastUpdatedYear: null },
      notes: ['Website unreachable'],
    };
  }

  const htmlLower = html.toLowerCase();
  let quality = 0;

  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  if (hasViewport) quality += 5;

  const hasFbPixel = htmlLower.includes('fbq(') || htmlLower.includes('facebook.com/tr');
  if (hasFbPixel) quality += 4;

  const hasGtm = htmlLower.includes('gtm.js') || htmlLower.includes('gtm-');
  if (hasGtm) quality += 3;

  const hasGa = htmlLower.includes('gtag(') || /\bua-\d/i.test(htmlLower) || /\bg-[a-z0-9]/i.test(htmlLower);
  if (hasGa) quality += 3;

  const copyrightMatch = html.match(/(?:copyright|©)[^0-9]{0,40}(2019|2020|2021|2022)\b/i);
  const lastUpdatedYear = copyrightMatch ? copyrightMatch[1] : null;
  if (!copyrightMatch) quality += 3; // no stale copyright year found = good signal

  const hasMetaDescription = /<meta[^>]+name=["']description["']/i.test(html);
  if (hasMetaDescription) quality += 2;

  const hasH1 = /<h1[\s>]/i.test(html);
  if (hasH1) quality += 2;

  const linkCount = (html.match(/<a\s[^>]*href=/gi) || []).length;
  if (linkCount >= 3) quality += 2;

  if (isHttps) quality += 1;

  // A fetched, live site is inherently a step up from "no website" — floor it just above
  // that tier even when every quality signal is missing (outdated site: 5-10 pts).
  const score = Math.max(5, Math.min(25, quality));

  return {
    score,
    signals: {
      hasWebsite: true,
      reachable: true,
      mobileResponsive: hasViewport,
      hasPixels: hasFbPixel || hasGtm || hasGa,
      lastUpdatedYear,
    },
    notes: [],
  };
}

module.exports = { scoreWebsiteQuality };
