const axios = require('axios');

async function enrichBusinessContact(domain, businessName) {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey || !domain) {
    return { ownerName: null, ownerTitle: null, ownerEmail: null };
  }

  try {
    // Strip protocol and path to get clean domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^www\./, '');

    const response = await axios.post(
      'https://api.apollo.io/v1/organizations/enrich',
      { domain: cleanDomain },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': apiKey,
        },
        timeout: 10000,
      }
    );

    const org = response.data?.organization;
    if (!org) return { ownerName: null, ownerTitle: null, ownerEmail: null };

    // Look for owner/decision maker in people list
    const people = org.organization_contacts || [];
    const owner = people.find((p) => {
      const title = (p.title || '').toLowerCase();
      return (
        title.includes('owner') ||
        title.includes('founder') ||
        title.includes('ceo') ||
        title.includes('president') ||
        title.includes('director') ||
        title.includes('manager')
      );
    }) || people[0];

    if (owner) {
      return {
        ownerName: `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || null,
        ownerTitle: owner.title || null,
        ownerEmail: owner.email || null,
      };
    }

    return { ownerName: null, ownerTitle: null, ownerEmail: null };
  } catch (err) {
    if (err.response?.status !== 422 && err.response?.status !== 404) {
      console.error('Apollo enrich error:', err.message);
    }
    return { ownerName: null, ownerTitle: null, ownerEmail: null };
  }
}

module.exports = { enrichBusinessContact };
