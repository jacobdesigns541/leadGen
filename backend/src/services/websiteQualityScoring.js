function scoreWebsiteQuality({ hasWebsiteUrl, htmlAvailable, html, isHttps }) {
  if (!hasWebsiteUrl) {
    return {
      score: 25,
      signals: { hasWebsite: false, reachable: false, mobileResponsive: false, hasPixels: false, lastUpdatedYear: null },
      notes: ['No website found'],
    };
  }

  if (!htmlAvailable) {
    return {
      score: 20,
      signals: { hasWebsite: true, reachable: false, mobileResponsive: false, hasPixels: false, lastUpdatedYear: null },
      notes: ['Website unreachable'],
    };
  }

  const htmlLower = html.toLowerCase();
  let opportunity = 0;

  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  if (!hasViewport) opportunity += 5;

  const hasFbPixel = htmlLower.includes('fbq(') || htmlLower.includes('facebook.com/tr');
  if (!hasFbPixel) opportunity += 4;

  const hasGtm = htmlLower.includes('gtm.js') || htmlLower.includes('gtm-');
  if (!hasGtm) opportunity += 3;

  const hasGa = htmlLower.includes('gtag(') || /\bua-\d/i.test(htmlLower) || /\bg-[a-z0-9]/i.test(htmlLower);
  if (!hasGa) opportunity += 3;

  const copyrightMatch = html.match(/(?:copyright|©)[^0-9]{0,40}(2019|2020|2021|2022)\b/i);
  const lastUpdatedYear = copyrightMatch ? copyrightMatch[1] : null;
  if (copyrightMatch) opportunity += 3;

  const hasMetaDescription = /<meta[^>]+name=["']description["']/i.test(html);
  if (!hasMetaDescription) opportunity += 2;

  const hasH1 = /<h1[\s>]/i.test(html);
  if (!hasH1) opportunity += 2;

  const linkCount = (html.match(/<a\s[^>]*href=/gi) || []).length;
  if (linkCount < 3) opportunity += 2;

  if (!isHttps) opportunity += 1;

  return {
    score: Math.min(opportunity, 25),
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
