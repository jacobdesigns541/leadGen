import React from 'react';

export default function LoadingState() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          width: '48px', height: '48px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
      </div>
      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '8px' }}>
        Scoring leads...
      </div>
      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '340px', margin: '0 auto' }}>
        Fetching businesses, checking ad presence, analyzing websites, and enriching contact data.
      </div>

      {/* Skeleton cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        maxWidth: '900px',
        margin: '32px auto 0',
      }}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      `}</style>
    </div>
  );
}

function SkeletonCard() {
  const shimmerStyle = {
    background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-2) 50%, var(--color-surface) 75%)',
    backgroundSize: '400px 100%',
    animation: 'shimmer 1.4s ease infinite',
    borderRadius: 'var(--radius-sm)',
  };

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px',
      textAlign: 'left',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...shimmerStyle, height: '18px', width: '70%', marginBottom: '8px' }} />
          <div style={{ ...shimmerStyle, height: '12px', width: '40%', marginBottom: '6px' }} />
          <div style={{ ...shimmerStyle, height: '12px', width: '85%' }} />
        </div>
        <div style={{ ...shimmerStyle, width: '62px', height: '62px', borderRadius: '50%', marginLeft: '12px', flexShrink: 0 }} />
      </div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <div style={{ ...shimmerStyle, height: '22px', width: '80px', borderRadius: 'var(--radius-full)' }} />
        <div style={{ ...shimmerStyle, height: '22px', width: '100px', borderRadius: 'var(--radius-full)' }} />
      </div>
      <div style={{ ...shimmerStyle, height: '60px', width: '100%', borderRadius: 'var(--radius-md)', marginBottom: '12px' }} />
      <div style={{ ...shimmerStyle, height: '50px', width: '100%', borderRadius: 'var(--radius-md)' }} />
    </div>
  );
}
