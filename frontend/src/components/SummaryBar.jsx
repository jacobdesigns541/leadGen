import React from 'react';

export default function SummaryBar({ leads, sortOrder, onSortChange, fromCache }) {
  const hotCount = leads.filter((l) => l.tier === 'hot').length;
  const warmCount = leads.filter((l) => l.tier === 'warm').length;
  const lowCount = leads.filter((l) => l.tier === 'low').length;

  const sortButtons = [
    { key: 'composite', label: 'Composite' },
    { key: 'digitalAds', label: 'Digital Ads' },
    { key: 'tv',         label: 'TV' },
    { key: 'radio',      label: 'Radio' },
    { key: 'website',    label: 'Website' },
    { key: 'reviews',    label: 'Reviews' },
  ];

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 20px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
    }}>
      {/* Left: counts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)' }}>
          {leads.length} <span style={{ color: 'var(--color-text-muted)', fontWeight: '400' }}>results</span>
          {fromCache && (
            <span style={{
              marginLeft: '8px',
              fontSize: '11px',
              color: 'var(--color-accent)',
              background: 'rgba(99,102,241,0.1)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}>
              cached
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <TierCount color="var(--color-hot)" count={hotCount} label="Hot" />
          <TierCount color="var(--color-warm)" count={warmCount} label="Warm" />
          <TierCount color="var(--color-low)" count={lowCount} label="Low" />
        </div>
      </div>

      {/* Right: sort buttons */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginRight: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Sort:
        </span>
        {sortButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => onSortChange(btn.key)}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: '500',
              background: sortOrder === btn.key ? 'var(--color-accent)' : 'var(--color-surface-2)',
              color: sortOrder === btn.key ? '#fff' : 'var(--color-text-muted)',
              border: `1px solid ${sortOrder === btn.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
              transition: 'all 0.15s',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TierCount({ color, count, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)' }}>{count}</span>
      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  );
}
