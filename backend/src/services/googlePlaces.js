const axios = require('axios');

const PLACES_BASE = 'https://places.googleapis.com/v1';

async function searchBusinesses(businessType, location, radiusMiles) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set');

  const radiusMeters = Math.round(radiusMiles * 1609.34);

  // Resolve location to lat/lng via Geocoding if it looks like a ZIP or city name
  let locationBias;
  const zipMatch = location.trim().match(/^\d{5}$/);
  if (zipMatch) {
    const coords = await geocodeLocation(location + ', CA', apiKey);
    locationBias = {
      circle: {
        center: { latitude: coords.lat, longitude: coords.lng },
        radius: radiusMeters,
      },
    };
  } else {
    const coords = await geocodeLocation(location + ', Los Angeles, CA', apiKey);
    locationBias = {
      circle: {
        center: { latitude: coords.lat, longitude: coords.lng },
        radius: radiusMeters,
      },
    };
  }

  const query = `${businessType} in Los Angeles CA`;
  const response = await axios.post(
    `${PLACES_BASE}/places:searchText`,
    {
      textQuery: query,
      locationBias,
      maxResultCount: 20,
    },
    {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.location,places.addressComponents,places.primaryType',
        'Content-Type': 'application/json',
      },
    }
  );

  return (response.data.places || []).map(normalizePlaceResult);
}

async function getPlaceDetails(placeId) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const response = await axios.get(`${PLACES_BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,location,addressComponents,primaryType',
    },
  });
  return normalizePlaceResult(response.data);
}

async function geocodeLocation(address, apiKey) {
  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: { address, key: apiKey },
  });
  const results = response.data.results;
  if (!results || results.length === 0) {
    // Default to central LA
    return { lat: 34.0522, lng: -118.2437 };
  }
  return results[0].geometry.location;
}

function normalizePlaceResult(place) {
  const addressComponents = place.addressComponents || [];
  const zipComponent = addressComponents.find((c) => c.types && c.types.includes('postal_code'));
  const zipCode = zipComponent ? zipComponent.longText || zipComponent.shortText : '';

  return {
    placeId: place.id,
    businessName: place.displayName?.text || '',
    category: place.primaryType || '',
    address: place.formattedAddress || '',
    phone: place.nationalPhoneNumber || '',
    website: place.websiteUri || '',
    rating: place.rating || 0,
    reviewCount: place.userRatingCount || 0,
    latitude: place.location?.latitude || 0,
    longitude: place.location?.longitude || 0,
    zipCode,
  };
}

module.exports = { searchBusinesses, getPlaceDetails };
