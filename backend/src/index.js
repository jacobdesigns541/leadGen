require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const leadsRouter = require('./routes/leads');
const { initDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/leads', leadsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Reports which API keys are present without exposing values
app.get('/api/debug/env', (req, res) => {
  res.json({
    GOOGLE_PLACES_API_KEY: !!process.env.GOOGLE_PLACES_API_KEY,
    SERP_API_KEY: !!process.env.SERP_API_KEY,
    APOLLO_API_KEY: !!process.env.APOLLO_API_KEY,
    NODE_ENV: process.env.NODE_ENV || 'not set',
    PORT: process.env.PORT || 'not set (using 5000)',
  });
});

initDb().then(() => {
  // Log env var presence at startup so Render logs show key status immediately
  console.log('[startup] API key status:', {
    GOOGLE_PLACES_API_KEY: !!process.env.GOOGLE_PLACES_API_KEY,
    SERP_API_KEY: !!process.env.SERP_API_KEY,
    APOLLO_API_KEY: !!process.env.APOLLO_API_KEY,
  });

  app.listen(PORT, () => {
    console.log(`LeadGen LA backend running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
