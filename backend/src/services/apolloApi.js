const axios = require('axios');

function extractDomain(website) {
  if (!website) return null;
  return website
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
}

async function enrichBusinessContact(website, businessName) {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) throw new Error('APOLLO_API_KEY is not set in environment');

  const domain = extractDomain(website);
  if (!domain) return { ownerName: null, ownerTitle: null, ownerEmail: null };

  let response;
  try {
    response = await axios.post(
      'https://api.apollo.io/v1/organizations/enrich',
      { domain },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': apiKey,
        },
        timeout: 10000,
      }
    );
  } catch (err) {
    // 404/422 mean "no organization found" — a valid empty result, not a failure
    if (err.response?.status === 422 || err.response?.status === 404) {
      return { ownerName: null, ownerTitle: null, ownerEmail: null };
    }
    throw err;
  }

  const org = response.data?.organization;
  if (!org) return { ownerName: null, ownerTitle: null, ownerEmail: null };

  const people = org.organization_contacts || [];
  const decisionMakerTitles = ['owner', 'founder', 'ceo', 'president', 'director', 'manager'];
  const owner =
    people.find((p) => decisionMakerTitles.some((t) => (p.title || '').toLowerCase().includes(t))) ||
    people[0];

  if (!owner) return { ownerName: null, ownerTitle: null, ownerEmail: null };

  return {
    ownerName: `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || null,
    ownerTitle: owner.title || null,
    ownerEmail: owner.email || null,
  };
}

module.exports = { enrichBusinessContact };
