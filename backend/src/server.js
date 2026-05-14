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

// Routes
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

// Database sync and server start
db.sequelize.sync()
  .then(() => {
    console.log('Database synced successfully');
// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-supplyroutes-lacks-optimize-supply-distribution', require('./routes/gap_supplyroutes_lacks_optimize_supply_distribution'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-donationroutes-lacks-match-donation-to-need', require('./routes/gap_donationroutes_lacks_match_donation_to_need'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-shelterroutes-lacks-optimize-shelter-assignments', require('./routes/gap_shelterroutes_lacks_optimize_shelter_assignments'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-volunteerroutes-lacks-ai-volunteer-matching', require('./routes/gap_volunteerroutes_lacks_ai_volunteer_matching'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-real-time-crisis-command-center-dashboard-surface-beyond', require('./routes/gap_no_real_time_crisis_command_center_dashboard_surface_beyond'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-mobile-app-for-first-responders', require('./routes/gap_limited_mobile_app_for_first_responders'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-integration-with-emergency-services-911-fema-red-cro', require('./routes/gap_limited_integration_with_emergency_services_911_fema_red_cro'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-social-media-monitoring-for-crisis-information', require('./routes/gap_no_social_media_monitoring_for_crisis_information'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-webhooks', require('./routes/gap_no_webhooks'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-payment-billing-module-for-donations-beyond-crud', require('./routes/gap_no_payment_billing_module_for_donations_beyond_crud'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-calendar-integration', require('./routes/gap_no_calendar_integration'));

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to sync database:', err);
  });

module.exports = app;
