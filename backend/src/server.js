const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./models');

const authRoutes = require('./routes/authRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const shelterRoutes = require('./routes/shelterRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');
const supplyRoutes = require('./routes/supplyRoutes');
const evacuationRoutes = require('./routes/evacuationRoutes');
const damageAssessmentRoutes = require('./routes/damageAssessmentRoutes');
const communicationRoutes = require('./routes/communicationRoutes');
const weatherAlertRoutes = require('./routes/weatherAlertRoutes');
const donationRoutes = require('./routes/donationRoutes');
const medicalResourceRoutes = require('./routes/medicalResourceRoutes');
const searchRescueRoutes = require('./routes/searchRescueRoutes');
const infrastructureRoutes = require('./routes/infrastructureRoutes');
const threatAnalysisRoutes = require('./routes/threatAnalysisRoutes');
const aiRoutes = require('./routes/aiRoutes');
const aiNewRoutes = require('./routes/aiNew');
const mapRoutes = require('./routes/mapRoutes');
const briefingRoutes = require('./routes/briefingRoutes');
const externalDataRoutes = require('./routes/externalDataRoutes');
const mutualAidRoutes = require('./routes/mutualAidRoutes');
const aarRoutes = require('./routes/aarRoutes');
const coordinationRoutes = require('./routes/coordinationRoutes');

// EEWS routes
const eewsSeismicFeedIngest = require('./routes/eewsFeat_seismicFeedIngest');
const eewsPWaveDetection = require('./routes/eewsFeat_pWaveDetection');
const eewsTsunamiPropagation = require('./routes/eewsFeat_tsunamiPropagation');
const eewsPopulationAlertRouter = require('./routes/eewsFeat_populationAlertRouter');
const eewsEewSiren = require('./routes/eewsFeat_eewSiren');
const eewsShakeAlertGateway = require('./routes/eewsFeat_shakeAlertGateway');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security headers via helmet
app.use(helmet({
  contentSecurityPolicy: false, // disabled to keep CRA dev/prod assets working
  crossOriginEmbedderPolicy: false,
}));

// Env-driven CORS (comma-separated list in CORS_ORIGINS, fallback localhost)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser tools (curl, server-to-server) with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS: origin not allowed'), false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', (req, res, next) => {
  const supported = ['/auth', '/coordination', '/health'];
  if (supported.some(prefix => req.path.startsWith(prefix))) return next();
  if (process.env.ENABLE_LEGACY_EMERGENCY_SURFACES === 'true' && process.env.NODE_ENV !== 'production') return next();
  return res.status(404).json({ error: 'Legacy generated endpoint is outside the governed incident-command boundary' });
});

// Routes
// Health check (mounted BEFORE catch-all /api router which applies auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Custom Response Views (mounted BEFORE other /api mounts and 404/error handlers)
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/supplies', supplyRoutes);
app.use('/api/evacuations', evacuationRoutes);
app.use('/api/damage-assessments', damageAssessmentRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/weather-alerts', weatherAlertRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/medical-resources', medicalResourceRoutes);
app.use('/api/search-rescue', searchRescueRoutes);
app.use('/api/infrastructure', infrastructureRoutes);
app.use('/api/threat-analysis', threatAnalysisRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', aiNewRoutes);





app.use('/api/ai', require('./routes/recoveryTraject'));
app.use('/api/ai', require('./routes/supplyPredict'));
app.use('/api/ai', require('./routes/vulnerability'));
app.use('/api/ai', require('./routes/resourceOptimize'));
app.use('/api/ai', require('./routes/impactForecast'));
app.use('/api/map', mapRoutes);
app.use('/api/briefing', briefingRoutes);
app.use('/api/external-data', externalDataRoutes);
app.use('/api/mutual-aid', mutualAidRoutes);
app.use('/api/aar', aarRoutes);
app.use('/api/coordination', coordinationRoutes);

// EEWS mounts
app.use('/api/eews/seismic-feed-ingest', eewsSeismicFeedIngest);
app.use('/api/eews/p-wave-detection', eewsPWaveDetection);
app.use('/api/eews/tsunami-propagation', eewsTsunamiPropagation);
app.use('/api/eews/population-alert-router', eewsPopulationAlertRouter);
app.use('/api/eews/eew-siren', eewsEewSiren);
app.use('/api/eews/shake-alert-gateway', eewsShakeAlertGateway);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Schema changes are applied explicitly by scripts/migrate.sh; startup is non-destructive.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
