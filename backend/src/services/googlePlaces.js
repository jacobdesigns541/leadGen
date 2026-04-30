const axios = require('axios');

const PLACES_BASE = 'https://places.googleapis.com/v1';

function axiosError(context, err) {
  const status = err.response?.status;
  const body = err.response?.data;
  const detail = body ? JSON.stringify(body) : err.message;
  return new Error(`${context} failed (HTTP ${status ?? 'no-response'}): ${detail}`);
}

async function searchBusinesses(businessType, location, radiusMiles) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not set in environment');

  const radiusMeters = Math.min(Math.round(radiusMiles * 1609.34), 50000); // Places API max 50 km

  let coords;
  try {
    coords = await geocodeLocation(
      location.trim().match(/^\d{5}$/) ? `${location}, CA` : `${location}, Los Angeles, CA`,
      apiKey
    );
  } catch (err) {
    console.error('[googlePlaces] Geocoding error:', err.message);
    coords = { lat: 34.0522, lng: -118.2437 }; // fall back to central LA
  }

  const query = `${businessType} near Los Angeles CA`;
  console.log(`[googlePlaces] searchText query="${query}" lat=${coords.lat} lng=${coords.lng} radius=${radiusMeters}m`);

  let response;
  try {
    response = await axios.post(
      `${PLACES_BASE}/places:searchText`,
      {
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: coords.lat, longitude: coords.lng },
            radius: radiusMeters,
          },
        },
        maxResultCount: 20,
      },
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,' +
            'places.websiteUri,places.rating,places.userRatingCount,places.location,' +
            'places.addressComponents,places.primaryType',
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
  } catch (err) {
    throw axiosError('Google Places searchText', err);
  }

  const places = response.data.places || [];
  console.log(`[googlePlaces] Received ${places.length} places for "${query}"`);
  return places.map(normalizePlaceResult);
}

async function geocodeLocation(address, apiKey) {
  let response;
  try {
    response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address, key: apiKey },
      timeout: 8000,
    });
  } catch (err) {
    throw axiosError('Geocoding', err);
  }

  if (response.data.status !== 'OK') {
    throw new Error(`Geocoding status "${response.data.status}" for address: ${address}`);
  }

  return response.data.results[0].geometry.location;
}

function normalizePlaceResult(place) {
  const components = place.addressComponents || [];
  const zip = components.find((c) => c.types?.includes('postal_code'));
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
    zipCode: zip?.longText || zip?.shortText || '',
  };
}

module.exports = { searchBusinesses };
