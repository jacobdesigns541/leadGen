const axios = require('axios');

const YOUTUBE_SEARCH_BASE = 'https://www.googleapis.com/youtube/v3/search';

async function youtubeSearch(query) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not set in environment');

  const response = await axios.get(YOUTUBE_SEARCH_BASE, {
    params: {
      q: query,
      part: 'snippet',
      type: 'video',
      maxResults: 5,
      videoDuration: 'short',
      key: apiKey,
    },
    timeout: 10000,
  });

  const items = response.data?.items || [];
  return items.map((item) => ({
    videoId: item.id?.videoId || '',
    title: item.snippet?.title || '',
    description: item.snippet?.description || '',
    channelTitle: item.snippet?.channelTitle || '',
  }));
}

function searchCommercial(businessName) {
  return youtubeSearch(`${businessName} commercial`);
}

function searchTvRadioSpot(businessName) {
  return youtubeSearch(`${businessName} TV spot radio advertisement`);
}

module.exports = { searchCommercial, searchTvRadioSpot };
