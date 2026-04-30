const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function searchLeads({ businessType, location, radiusMiles = 60 }) {
  const response = await fetch(`${API_BASE}/leads/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessType, location, radiusMiles }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}
