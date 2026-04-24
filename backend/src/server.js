const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
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

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Database sync and server start
db.sequelize.sync()
  .then(() => {
    console.log('Database synced successfully');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to sync database:', err);
  });

module.exports = app;
