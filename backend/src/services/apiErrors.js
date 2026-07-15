// Formats an axios error into a short, human-readable reason string such as
// "Serper: 401 Invalid API key" or "YouTube: 403 API not enabled" — used to
// surface the real cause on the card instead of a generic "Unavailable".
function formatApiError(provider, err) {
  if (!err) return `${provider}: unknown error`;

  const status = err.response?.status;
  const data = err.response?.data;

  let bodyMessage = null;
  if (typeof data === 'string') bodyMessage = data;
  else if (data?.message) bodyMessage = data.message;
  else if (data?.error?.message) bodyMessage = data.error.message;
  else if (typeof data?.error === 'string') bodyMessage = data.error;

  const detail = bodyMessage || err.code || err.message || 'Unknown error';
  const trimmedDetail = detail.length > 160 ? `${detail.slice(0, 160)}…` : detail;

  return status ? `${provider}: ${status} ${trimmedDetail}` : `${provider}: ${trimmedDetail}`;
}

module.exports = { formatApiError };
