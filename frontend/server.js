const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

app.use(express.static(DIST));

// Proxy /api requests to the backend
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const { createProxyMiddleware } = require('http-proxy-middleware');
app.use('/api', createProxyMiddleware({ target: BACKEND_URL, changeOrigin: true }));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LeadGen LA frontend serving on port ${PORT}`);
});
