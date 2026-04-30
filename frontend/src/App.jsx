import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import SummaryBar from './components/SummaryBar';
import ScoreGuide from './components/ScoreGuide';
import LeadCard from './components/LeadCard';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import { searchLeads } from './utils/api';
import { getScoreTier } from './utils/scoring';

const REP_NAME = 'Sales Rep';

export default function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [sortOrder, setSortOrder] = useState('composite');
  const [activeFilters, setActiveFilters] = useState([]);

  async function handleSearch(params) {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const result = await searchLeads(params);
      // Ensure tier is set correctly based on composite score
      const enriched = (result.leads || []).map((lead) => ({
        ...lead,
        tier: lead.tier || getScoreTier(lead.scores?.composite ?? 100),
      }));
      setLeads(enriched);
      setFromCache(result.fromCache || false);
    } catch (err) {
      setError(err.message);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterToggle(filterKey) {
    setActiveFilters((prev) =>
      prev.includes(filterKey) ? prev.filter((f) => f !== filterKey) : [...prev, filterKey]
    );
  }

  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Apply filters
    if (activeFilters.includes('hispanicZip')) {
      result = result.filter((l) => l.isHispanicZip);
    }
    if (activeFilters.includes('noGoogleAds')) {
      result = result.filter((l) => l.noGoogleAds);
    }
    if (activeFilters.includes('noMetaAds')) {
      result = result.filter((l) => l.noMetaAds);
    }
    if (activeFilters.includes('noTvAds')) {
      result = result.filter((l) => l.noTvAds);
    }
    if (activeFilters.includes('noRadioAds')) {
      result = result.filter((l) => l.noRadioAds);
    }
    if (activeFilters.includes('weakWebsite')) {
      result = result.filter((l) => (l.scores?.website ?? 0) <= 8);
    }
    if (activeFilters.includes('under50Reviews')) {
      result = result.filter((l) => (l.reviewCount ?? 0) < 50);
    }
    if (activeFilters.includes('hotOnly')) {
      result = result.filter((l) => l.tier === 'hot');
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'composite':
          return (a.scores?.composite ?? 100) - (b.scores?.composite ?? 100);
        case 'digitalAds':
          return (a.scores?.digitalAds ?? 20) - (b.scores?.digitalAds ?? 20);
        case 'tv':
          return (a.scores?.tv ?? 20) - (b.scores?.tv ?? 20);
        case 'radio':
          return (a.scores?.radio ?? 20) - (b.scores?.radio ?? 20);
        case 'website':
          return (a.scores?.website ?? 20) - (b.scores?.website ?? 20);
        case 'reviews':
          return (a.scores?.reviews ?? 10) - (b.scores?.reviews ?? 10);
        default:
          return 0;
      }
    });

    return result;
  }, [leads, activeFilters, sortOrder]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header repName={REP_NAME} />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px 60px' }}>
        <SearchPanel
          onSearch={handleSearch}
          activeFilters={activeFilters}
          onFilterToggle={handleFilterToggle}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          loading={loading}
        />

        {!loading && hasSearched && !error && leads.length > 0 && (
          <>
            <SummaryBar
              leads={filteredAndSortedLeads}
              sortOrder={sortOrder}
              onSortChange={setSortOrder}
              fromCache={fromCache}
            />
            <ScoreGuide />
          </>
        )}

        {loading ? (
          <LoadingState />
        ) : !hasSearched || (hasSearched && leads.length === 0 && !error) ? (
          <EmptyState hasSearched={hasSearched} error={error} />
        ) : error ? (
          <EmptyState hasSearched={hasSearched} error={error} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
          }}>
            {filteredAndSortedLeads.map((lead) => (
              <LeadCard key={lead.placeId || lead.businessName} lead={lead} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
