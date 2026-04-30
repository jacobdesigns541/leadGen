const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || '/api';

// Log at module load so the browser console shows which URL is in use
console.log('[api] API_BASE =', API_BASE);

export async function searchLeads({ businessType, location, radiusMiles = 60 }) {
  const url = `${API_BASE}/leads/search`;
  console.log('[api] POST', url, { businessType, location, radiusMiles });

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessType, location, radiusMiles }),
    });
  } catch (networkErr) {
    throw new Error(`Network error — could not reach backend at ${API_BASE}. (${networkErr.message})`);
  }

  if (!response.ok) {
    // Try to parse the JSON error body; fall back to raw text
    const text = await response.text();
    let message;
    try {
      message = JSON.parse(text).error || text;
    } catch {
      message = text || `HTTP ${response.status}`;
    }
    throw new Error(message);
  }

  return response.json();
}
