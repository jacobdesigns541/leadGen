import React, { useState } from 'react';
import { getTierColor, getTierBg, getTierBorder, getTierLabel, getMetricBarColor, METRIC_DEFINITIONS } from '../utils/scoring';

export default function LeadCard({ lead }) {
  const [expanded, setExpanded] = useState(false);

  const {
    businessName, category, address, phone, website,
    rating, reviewCount, isHispanicZip,
    ownerName, ownerTitle, ownerEmail,
    scores, tier, noGoogleAds, noMetaAds, pitchNote,
  } = lead;

  const tierColor = getTierColor(tier);
  const tierBg = getTierBg(tier);
  const tierBorder = getTierBorder(tier);

  const domain = website
    ? website.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null;

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: `1px solid ${tierBorder}`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      transition: 'transform 0.15s, box-shadow 0.15s',
      position: 'relative',
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.3), 0 0 0 1px ${tierBorder}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top accent stripe */}
      <div style={{ height: '3px', background: `linear-gradient(90deg, ${tierColor}, transparent)` }} />

      <div style={{ padding: '18px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h3 style={{
                fontSize: '15px', fontWeight: '700', color: 'var(--color-text)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: '220px',
              }}>
                {businessName}
              </h3>
              {isHispanicZip && (
                <span style={{
                  fontSize: '10px', fontWeight: '700', padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-hispanic-bg)',
                  color: 'var(--color-hispanic)',
                  border: '1px solid var(--color-hispanic-border)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                }}>
                  Hispanic ZIP
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '11px', fontWeight: '600', padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
              }}>
                {category}
              </span>
            </div>
            <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ flexShrink: 0, marginTop: '1px' }}>📍</span>
              <span style={{ lineHeight: '1.4' }}>{address || 'Address unavailable'}</span>
            </div>
          </div>

          {/* Score badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
            <div style={{
              width: '62px', height: '62px',
              borderRadius: '50%',
              background: tierBg,
              border: `3px solid ${tierColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${tierColor}40`,
              flexDirection: 'column',
            }}>
              <span style={{ fontSize: '20px', fontWeight: '800', color: tierColor, lineHeight: 1 }}>
                {scores.composite}
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>of 100</span>
            <span style={{
              fontSize: '10px', fontWeight: '700',
              color: tierColor,
              marginTop: '2px',
              textTransform: 'uppercase', letterSpacing: '0.3px',
            }}>
              {getTierLabel(tier)}
            </span>
          </div>
        </div>

        {/* Pills row */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {domain && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: '500', padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(99,102,241,0.1)',
                color: 'var(--color-accent)',
                border: '1px solid rgba(99,102,241,0.25)',
                transition: 'background 0.15s',
              }}
            >
              🌐 {domain.length > 24 ? domain.slice(0, 24) + '…' : domain}
            </a>
          )}
          {noGoogleAds && (
            <StatusPill color="#22c55e" label="No Google Ads" icon="✓" />
          )}
          {noMetaAds && (
            <StatusPill color="#22c55e" label="No Meta Ads" icon="✓" />
          )}
          {rating > 0 && (
            <StatusPill color="#f59e0b" label={`★ ${rating.toFixed(1)} (${reviewCount})`} icon="" />
          )}
        </div>

        {/* Contact block — always shown when there is at least a phone number */}
        {(phone || ownerName || ownerEmail) && (
          <div style={{
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '14px',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
              Contact Info
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

              {/* Owner name + title (from Apollo) */}
              {ownerName && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)' }}>{ownerName}</span>
                  {ownerTitle && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>· {ownerTitle}</span>}
                </div>
              )}

              {/* Phone — labeled with person name if known, otherwise 'General' */}
              {phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', minWidth: '0', flexShrink: 0 }}>
                    {ownerName ? `${ownerName.split(' ')[0]}:` : 'General:'}
                  </span>
                  <a
                    href={`tel:${phone.replace(/[\s\-()]/g, '')}`}
                    style={{ fontSize: '13px', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    📞 {phone}
                  </a>
                </div>
              )}

              {/* Email — always shown; muted placeholder if not found */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', flexShrink: 0 }}>Email:</span>
                {ownerEmail ? (
                  <a
                    href={`mailto:${ownerEmail}`}
                    style={{ fontSize: '12px', color: '#6ee7f7', wordBreak: 'break-all' }}
                  >
                    ✉ {ownerEmail}
                  </a>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                    Not found
                  </span>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Score breakdown */}
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '11px', fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '0.8px',
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '0',
              marginBottom: expanded ? '10px' : '0',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)', display: 'inline-block', transition: 'transform 0.2s' }}>▶</span>
            Score Breakdown
          </button>

          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {METRIC_DEFINITIONS.map((metric) => {
                const score = scores[metric.key] ?? 0;
                const pct = (score / metric.maxScore) * 100;
                const barColor = getMetricBarColor(score, metric.maxScore);
                return (
                  <div key={metric.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{metric.label}</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: barColor }}>
                        {score}/{metric.maxScore}
                      </span>
                    </div>
                    <div style={{
                      height: '6px',
                      background: 'var(--color-surface-2)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${barColor}, ${barColor}aa)`,
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.4s ease',
                      }} />
                      {/* Dot indicator */}
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: `calc(${pct}% - 4px)`,
                        transform: 'translateY(-50%)',
                        width: '8px', height: '8px',
                        borderRadius: '50%',
                        background: barColor,
                        boxShadow: `0 0 4px ${barColor}`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pitch note */}
        {pitchNote && (
          <div style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            lineHeight: '1.6',
          }}>
            <span style={{ fontWeight: '700', color: 'var(--color-accent)', marginRight: '5px' }}>💡 Pitch:</span>
            {pitchNote}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ color, label, icon }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: '500', padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      background: `${color}15`,
      color: color,
      border: `1px solid ${color}35`,
    }}>
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}
