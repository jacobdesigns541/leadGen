import React from 'react';

export default function EmptyState({ hasSearched, error }) {
  if (error) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-low)', marginBottom: '8px' }}>
          Search Failed
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '380px', margin: '0 auto', background: 'var(--color-surface)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-low-border)' }}>
          {error}
        </div>
      </div>
    );
  }

  if (hasSearched) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '8px' }}>
          No results found
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Try a different business type, location, or expand your radius.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎯</div>
      <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '10px' }}>
        Find your next opportunity
      </div>
      <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.7' }}>
        Search for local businesses in the Los Angeles area. Each lead is scored
        on digital ad presence, website quality, reviews, social media, and competitor activity.
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        maxWidth: '640px',
        margin: '32px auto 0',
      }}>
        {[
          { icon: '📊', title: 'Scored Leads', desc: 'Every business scored 0-100 on 5 key metrics' },
          { icon: '🌮', title: 'Hispanic Market', desc: 'ZIP code bonuses for high-density Hispanic areas' },
          { icon: '💾', title: '7-Day Cache', desc: 'Results cached to preserve your API quota' },
        ].map((item) => (
          <div key={item.title} style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '4px' }}>{item.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
