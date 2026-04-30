import React from 'react';

export default function ScoreGuide() {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 20px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginRight: '8px' }}>
        Score Guide:
      </span>
      {[
        { label: '0–30 Hot', color: 'var(--color-hot)', bg: 'var(--color-hot-bg)', border: 'var(--color-hot-border)' },
        { label: '31–60 Warm', color: 'var(--color-warm)', bg: 'var(--color-warm-bg)', border: 'var(--color-warm-border)' },
        { label: '61–100 Low Priority', color: 'var(--color-low)', bg: 'var(--color-low-bg)', border: 'var(--color-low-border)' },
      ].map((item) => (
        <div key={item.label} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          background: item.bg,
          border: `1px solid ${item.border}`,
        }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color }} />
          <span style={{ fontSize: '12px', fontWeight: '600', color: item.color }}>{item.label}</span>
        </div>
      ))}
      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
        Lower score = better opportunity
      </span>
    </div>
  );
}
