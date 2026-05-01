export function getTierColor(tier) {
  switch (tier) {
    case 'hot': return 'var(--color-hot)';
    case 'warm': return 'var(--color-warm)';
    case 'low': return 'var(--color-low)';
    default: return 'var(--color-text-muted)';
  }
}

export function getTierBg(tier) {
  switch (tier) {
    case 'hot': return 'var(--color-hot-bg)';
    case 'warm': return 'var(--color-warm-bg)';
    case 'low': return 'var(--color-low-bg)';
    default: return 'transparent';
  }
}

export function getTierBorder(tier) {
  switch (tier) {
    case 'hot': return 'var(--color-hot-border)';
    case 'warm': return 'var(--color-warm-border)';
    case 'low': return 'var(--color-low-border)';
    default: return 'var(--color-border)';
  }
}

export function getTierLabel(tier) {
  switch (tier) {
    case 'hot': return 'Hot Lead';
    case 'warm': return 'Warm Lead';
    case 'low': return 'Low Priority';
    default: return 'Unknown';
  }
}

export function getScoreTier(composite) {
  if (composite <= 30) return 'hot';
  if (composite <= 60) return 'warm';
  return 'low';
}

// Returns bar color: low score = opportunity = green
export function getMetricBarColor(score, maxScore) {
  const pct = score / maxScore;
  if (pct <= 0.35) return 'var(--color-hot)';
  if (pct <= 0.65) return 'var(--color-warm)';
  return 'var(--color-low)';
}

export const METRIC_DEFINITIONS = [
  { key: 'digitalAds', label: 'Digital Ad Presence', maxScore: 20 },
  { key: 'tv',         label: 'TV Presence',          maxScore: 20, note: 'Serper signal — verify manually' },
  { key: 'radio',      label: 'Radio Presence',       maxScore: 20, note: 'Serper signal — verify manually' },
  { key: 'website',    label: 'Website Quality',      maxScore: 20 },
  { key: 'reviews',    label: 'Reviews',              maxScore: 10 },
  { key: 'social',     label: 'Social Media',         maxScore: 10 },
];
