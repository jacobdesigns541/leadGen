const axios = require('axios');

async function checkWebsiteQuality(websiteUrl) {
  if (!websiteUrl) {
    return { score: 1, hasWebsite: false, isMobileResponsive: false, hasTrackingPixels: false };
  }

  try {
    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      },
      maxRedirects: 5,
    });

    const html = response.data || '';
    const htmlLower = html.toLowerCase();

    const isMobileResponsive =
      htmlLower.includes('viewport') &&
      (htmlLower.includes('width=device-width') || htmlLower.includes('initial-scale'));

    const hasGTM =
      htmlLower.includes('googletagmanager') || htmlLower.includes('gtm.js');
    const hasFBPixel =
      htmlLower.includes('fbevents.js') ||
      htmlLower.includes('connect.facebook.net') ||
      htmlLower.includes('fbq(');
    const hasGA =
      htmlLower.includes('google-analytics.com') ||
      htmlLower.includes('gtag(') ||
      htmlLower.includes('ga(');
    const hasTrackingPixels = hasGTM || hasFBPixel || hasGA;

    const hasMetaNoIndex = htmlLower.includes('noindex');
    const isWordPress = htmlLower.includes('wp-content') || htmlLower.includes('wordpress');
    const hasModernFramework =
      htmlLower.includes('react') ||
      htmlLower.includes('vue') ||
      htmlLower.includes('angular') ||
      htmlLower.includes('next') ||
      html.includes('__nuxt');

    let score;
    if (!isMobileResponsive && !hasTrackingPixels) {
      score = 3 + Math.floor(Math.random() * 5); // 3-7 outdated/basic
    } else if (isMobileResponsive && hasTrackingPixels) {
      score = 15 + Math.floor(Math.random() * 6); // 15-20 modern well-optimized
    } else if (isMobileResponsive || hasTrackingPixels) {
      score = 8 + Math.floor(Math.random() * 7); // 8-14 partial
    } else {
      score = 5;
    }

    // Bonus for modern frameworks
    if (hasModernFramework && score < 18) score = Math.min(score + 3, 20);

    return {
      score,
      hasWebsite: true,
      isMobileResponsive,
      hasTrackingPixels,
      hasGTM,
      hasFBPixel,
      hasGA,
    };
  } catch (err) {
    // Website exists but couldn't be fetched — still give minimal score
    return {
      score: 2,
      hasWebsite: true,
      isMobileResponsive: false,
      hasTrackingPixels: false,
      hasGTM: false,
      hasFBPixel: false,
      hasGA: false,
      error: err.message,
    };
  }
}

module.exports = { checkWebsiteQuality };
