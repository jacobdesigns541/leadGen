import React from 'react';

export default function Header({ repName }) {
  return (
    <header style={{
      background: 'linear-gradient(135deg, #1a1d27 0%, #22263a 100%)',
      borderBottom: '1px solid var(--color-border)',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, var(--color-accent), #8b5cf6)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: '800',
          color: '#fff',
          letterSpacing: '-1px',
          boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
        }}>
          L
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '17px', letterSpacing: '-0.3px', color: '#fff' }}>
            LeadGen <span style={{ color: 'var(--color-accent)' }}>LA</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '0.5px', marginTop: '-2px' }}>
            HISPANIC MARKET INTELLIGENCE
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: '700',
          color: '#fff',
        }}>
          {repName ? repName.charAt(0).toUpperCase() : 'R'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)' }}>
            {repName || 'Sales Rep'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Account Executive</span>
        </div>
      </div>
    </header>
  );
}
