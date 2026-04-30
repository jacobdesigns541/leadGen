import React, { useState } from 'react';

const BUSINESS_TYPES = [
  'Auto Dealership',
  'Immigration Law',
  'Family Law',
  'Dental / Orthodontic',
  'Tax / Accounting',
  'Insurance Broker',
  'Home Services / HVAC',
  'Event Venue / Quinceañera',
  'Restaurant Group',
  'Real Estate',
  'Notary Services',
];

const RADIUS_OPTIONS = [10, 25, 50, 60, 75, 100];

const SORT_OPTIONS = [
  { value: 'composite', label: 'Best opportunity first' },
  { value: 'digitalAds', label: 'No digital ads first' },
  { value: 'website', label: 'Weakest website first' },
  { value: 'reviews', label: 'Fewest reviews first' },
];

const QUICK_FILTERS = [
  { key: 'hispanicZip', label: '🌟 Hispanic Market ZIP' },
  { key: 'noGoogleAds', label: 'No Google Ads' },
  { key: 'noMetaAds', label: 'No Meta Ads' },
  { key: 'weakWebsite', label: 'Weak Website' },
  { key: 'under50Reviews', label: 'Under 50 Reviews' },
  { key: 'competitorsAds', label: 'Competitors Advertising' },
  { key: 'hotOnly', label: '🔥 Hot Leads Only' },
];

export default function SearchPanel({ onSearch, activeFilters, onFilterToggle, sortOrder, onSortChange, loading }) {
  const [businessType, setBusinessType] = useState('all');
  const [location, setLocation] = useState('90012');
  const [radius, setRadius] = useState(60);

  function handleSubmit(e) {
    e.preventDefault();
    onSearch({
      businessType: businessType || 'all',
      location: location.trim() || '90012',
      radiusMiles: radius,
    });
  }

  const inputStyle = {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    padding: '10px 14px',
    width: '100%',
    fontSize: '14px',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: '6px',
  };

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      marginBottom: '20px',
    }}>
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '4px' }}>
          Search Businesses
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Find and score leads in the Los Angeles area
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px 180px', gap: '16px', marginBottom: '16px' }}>
          {/* Business Type */}
          <div>
            <label style={labelStyle}>Business Type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="all">All Business Types</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label style={labelStyle}>ZIP Code or City</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. 90022 or East LA"
              style={inputStyle}
            />
          </div>

          {/* Radius */}
          <div>
            <label style={labelStyle}>Search Radius</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>{r} miles</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label style={labelStyle}>Sort By</label>
            <select
              value={sortOrder}
              onChange={(e) => onSortChange(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px', marginRight: '4px' }}>
            Filters:
          </span>
          {QUICK_FILTERS.map((filter) => {
            const active = activeFilters.includes(filter.key);
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => onFilterToggle(filter.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: active ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  color: active ? '#fff' : 'var(--color-text-muted)',
                  border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? 'var(--color-border)' : 'linear-gradient(135deg, var(--color-accent), #8b5cf6)',
            color: '#fff',
            padding: '11px 28px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s',
            opacity: loading ? 0.6 : 1,
            boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '16px' }}>⟳</span>
              Scoring leads...
            </>
          ) : (
            <>🔍 Find &amp; Score Leads</>
          )}
        </button>
      </form>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #22263a; color: #e8eaf0; }
        input:focus, select:focus { border-color: var(--color-accent) !important; }
      `}</style>
    </div>
  );
}
