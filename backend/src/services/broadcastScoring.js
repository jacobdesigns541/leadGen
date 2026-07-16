const WEBSITE_KEYWORD_GROUPS = [
  { keywords: ['as seen on tv', 'as seen on television'], note: '📺 Website mentions TV presence' },
  { keywords: ['as heard on', 'hear us on', 'listen to us on'], note: '📻 Website mentions radio presence' },
  { keywords: ['watch our commercial', 'watch our ad', 'view our commercial'], note: '📺 Website references commercial video' },
  { keywords: ['tv commercial', 'television commercial', 'television ad'], note: '📺 TV commercial mentioned on website' },
  { keywords: ['radio commercial', 'radio ad', 'radio spot', 'on-air'], note: '📻 Radio ad mentioned on website' },
  { keywords: ['comercial de television', 'comercial de radio', 'en la television', 'en la radio'], note: '📺📻 Spanish-language broadcast mention found' },
];

const NETWORKS = ['NBC', 'CBS', 'ABC', 'Fox', 'Univision', 'Telemundo', 'CNN'];
const AD_CONTEXT_WORDS = ['commercial', 'ad', 'sponsor', 'airs'];
const AD_CONTEXT_WINDOW = 100; // chars on each side -> ~200 char window

const YOUTUBE_KEYWORDS = ['commercial', 'tv spot', 'television ad', 'radio ad', 'radio spot', 'advertisement', 'comercial'];

function hasNearbyAdContext(html, index, matchLength) {
  const windowStart = Math.max(0, index - AD_CONTEXT_WINDOW);
  const windowEnd = Math.min(html.length, index + matchLength + AD_CONTEXT_WINDOW);
  const windowText = html.slice(windowStart, windowEnd).toLowerCase();
  return AD_CONTEXT_WORDS.some((w) => windowText.includes(w));
}

// Returns one note per distinct broadcast signal detected on the website —
// each note is one "signal found" for the count-based scoring below.
function scoreBroadcastFromHtml(html) {
  const notes = [];
  const htmlLower = html.toLowerCase();

  for (const group of WEBSITE_KEYWORD_GROUPS) {
    if (group.keywords.some((k) => htmlLower.includes(k))) {
      notes.push(group.note);
    }
  }

  // Network names near ad-context keywords
  const foundNetworks = new Set();
  for (const network of NETWORKS) {
    const re = new RegExp(`\\b${network}\\b`, 'gi');
    let m;
    while ((m = re.exec(html)) !== null) {
      if (hasNearbyAdContext(html, m.index, m[0].length)) {
        foundNetworks.add(network);
        break;
      }
    }
  }
  for (const network of foundNetworks) {
    notes.push(`📺 Network reference found: ${network}`);
  }

  // FM frequencies near ad-context keywords (fresh regex instance — 'g' regexes are stateful
  // and this function can run concurrently across businesses)
  const fmRe = /\b\d{2,3}\.\d\s?FM\b/gi;
  const foundFm = new Set();
  let fmMatch;
  while ((fmMatch = fmRe.exec(html)) !== null) {
    if (hasNearbyAdContext(html, fmMatch.index, fmMatch[0].length)) foundFm.add(fmMatch[0].trim());
  }
  for (const freq of foundFm) {
    notes.push(`📻 Radio frequency reference found: ${freq}`);
  }

  // AM frequencies near ad-context keywords
  const amRe = /\b\d{3,4}\s?AM\b/gi;
  const foundAm = new Set();
  let amMatch;
  while ((amMatch = amRe.exec(html)) !== null) {
    if (hasNearbyAdContext(html, amMatch.index, amMatch[0].length)) foundAm.add(amMatch[0].trim());
  }
  for (const freq of foundAm) {
    notes.push(`📻 AM radio reference found: ${freq}`);
  }

  // Embedded YouTube video in an iframe
  const ytIframeRe = /<iframe[^>]+src=["']([^"']*youtube\.com\/embed[^"']*)["']/gi;
  const foundYtEmbeds = new Set();
  let ytMatch;
  while ((ytMatch = ytIframeRe.exec(html)) !== null) {
    const idMatch = ytMatch[1].match(/embed\/([a-zA-Z0-9_-]+)/);
    const videoId = idMatch ? idMatch[1] : null;
    if (videoId && !foundYtEmbeds.has(videoId)) {
      foundYtEmbeds.add(videoId);
      notes.push(`🎬 Embedded YouTube video found on website — possible commercial (https://youtube.com/watch?v=${videoId})`);
    }
  }

  // Embedded Vimeo video
  if (/<iframe[^>]+src=["'][^"']*vimeo\.com[^"']*["']/i.test(html)) {
    notes.push('🎬 Embedded Vimeo video found — possible commercial');
  }

  // Self-hosted <video> tag
  if (/<video[^>]+src=["'][^"']+["']/i.test(html)) {
    notes.push('🎬 Self-hosted video found on website — possible commercial');
  }

  // Image alt text or filename referencing a commercial
  const imgRe = /<img[^>]+>/gi;
  const imgKeywords = ['commercial', 'tv-spot', 'radio-ad'];
  let imgMatch;
  let imgFound = false;
  while ((imgMatch = imgRe.exec(html)) !== null) {
    if (imgKeywords.some((k) => imgMatch[0].toLowerCase().includes(k))) {
      imgFound = true;
      break;
    }
  }
  if (imgFound) {
    notes.push('📺 Image referencing commercial found');
  }

  return { notes };
}

function scoreBroadcastFromYoutube(videos) {
  const notes = [];
  for (const video of videos) {
    const text = `${video.title} ${video.description}`.toLowerCase();
    if (YOUTUBE_KEYWORDS.some((k) => text.includes(k))) {
      notes.push(`🎬 YouTube video found: ${video.title} — https://youtube.com/watch?v=${video.videoId} — verify if active broadcast ad`);
    }
  }
  return { notes };
}

// Low score = no/weak broadcast signals = underperforming = good lead signal.
// High score = strong confirmed broadcast presence = already well served on this channel.
function signalCountToScore(count) {
  if (count === 0) return 2; // No broadcast signals detected: 1-3 pts
  if (count <= 2) return 10; // Weak signals (1-2 found): 8-12 pts
  if (count <= 4) return 16; // Moderate signals (3-4 found): 14-18 pts
  return 24; // Strong broadcast presence confirmed: 22-25 pts
}

function scoreBroadcast({ html, htmlAvailable, youtubeVideos, youtubeErrorReason }) {
  if (!htmlAvailable) {
    const notes = ['Website unavailable — broadcast check incomplete'];
    if (youtubeErrorReason) notes.push(`⚠️ YouTube check unavailable — ${youtubeErrorReason}`);
    return { score: null, notes, signalCount: null };
  }

  const websiteResult = scoreBroadcastFromHtml(html);
  const youtubeResult = scoreBroadcastFromYoutube(youtubeVideos || []);

  const signalNotes = [...websiteResult.notes, ...youtubeResult.notes];
  const signalCount = signalNotes.length;

  const notes = [...signalNotes];
  if (youtubeErrorReason) notes.push(`⚠️ YouTube check unavailable — ${youtubeErrorReason}`);

  if (notes.length === 0) {
    notes.push('No broadcast signals detected — verify manually during outreach');
  }

  return { score: signalCountToScore(signalCount), notes, signalCount };
}

module.exports = { scoreBroadcast };
