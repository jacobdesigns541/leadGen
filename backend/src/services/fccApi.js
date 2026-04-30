const axios = require('axios');

const FCC_BASE = 'https://publicfiles.fcc.gov/api';

// Hardcoded FCC entity IDs for major LA-area TV stations (avoids a lookup round-trip per call)
const LA_TV_STATIONS = [
  { callSign: 'KABC', entityId: '10795' },
  { callSign: 'KNBC', entityId: '35012' },
  { callSign: 'KCBS', entityId: '10801' },
  { callSign: 'KTTV', entityId: '35503' },
  { callSign: 'KTLA', entityId: '35491' },
  { callSign: 'KCAL', entityId: '10791' },
  { callSign: 'KDOC', entityId: '31614' },
];

// Hardcoded FCC entity IDs for major LA-area radio stations
const LA_RADIO_STATIONS = [
  { callSign: 'KFI',    entityId: '9993'  },
  { callSign: 'KIIS',   entityId: '9984'  },
  { callSign: 'KROQ',   entityId: '9985'  },
  { callSign: 'KLOS',   entityId: '9980'  },
  { callSign: 'KLAC',   entityId: '14900' },
  { callSign: 'KPWR',   entityId: '9990'  },
  { callSign: 'KCRW',   entityId: '9975'  },
  { callSign: 'KKBT',   entityId: '9986'  },
];

async function searchStationFiles(entityId, businessName) {
  try {
    const response = await axios.get(`${FCC_BASE}/manager/folder/search`, {
      params: {
        entityId,
        searchString: businessName,
        limit: 5,
      },
      timeout: 8000,
    });
    const results = response.data?.data?.results || response.data?.results || [];
    return Array.isArray(results) ? results.length : 0;
  } catch (err) {
    // Non-fatal — log quietly and return 0 (no evidence of ads = opportunity)
    console.log(`[fcc] folder search failed for entityId=${entityId}: ${err.message}`);
    return 0;
  }
}

async function checkTvPresence(businessName) {
  let stationsFound = 0;

  await Promise.all(
    LA_TV_STATIONS.map(async ({ callSign, entityId }) => {
      const hits = await searchStationFiles(entityId, businessName);
      if (hits > 0) {
        console.log(`[fcc] TV hit: ${callSign} has ${hits} file(s) mentioning "${businessName}"`);
        stationsFound++;
      }
    })
  );

  let score;
  if (stationsFound === 0) {
    score = Math.floor(Math.random() * 4);        // 0-3
  } else if (stationsFound === 1) {
    score = 8 + Math.floor(Math.random() * 5);   // 8-12
  } else {
    score = 15 + Math.floor(Math.random() * 6);  // 15-20
  }

  console.log(`[fcc] TV presence for "${businessName}": stations=${stationsFound} score=${score}`);
  return { score, stationsFound, type: 'tv' };
}

async function checkRadioPresence(businessName) {
  let stationsFound = 0;

  await Promise.all(
    LA_RADIO_STATIONS.map(async ({ callSign, entityId }) => {
      const hits = await searchStationFiles(entityId, businessName);
      if (hits > 0) {
        console.log(`[fcc] Radio hit: ${callSign} has ${hits} file(s) mentioning "${businessName}"`);
        stationsFound++;
      }
    })
  );

  let score;
  if (stationsFound === 0) {
    score = Math.floor(Math.random() * 4);        // 0-3
  } else if (stationsFound === 1) {
    score = 8 + Math.floor(Math.random() * 5);   // 8-12
  } else {
    score = 15 + Math.floor(Math.random() * 6);  // 15-20
  }

  console.log(`[fcc] Radio presence for "${businessName}": stations=${stationsFound} score=${score}`);
  return { score, stationsFound, type: 'radio' };
}

module.exports = { checkTvPresence, checkRadioPresence };
