const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./User')(sequelize, Sequelize);
db.Incident = require('./Incident')(sequelize, Sequelize);
db.Resource = require('./Resource')(sequelize, Sequelize);
db.Shelter = require('./Shelter')(sequelize, Sequelize);
db.Volunteer = require('./Volunteer')(sequelize, Sequelize);
db.Supply = require('./Supply')(sequelize, Sequelize);
db.Evacuation = require('./Evacuation')(sequelize, Sequelize);
db.DamageAssessment = require('./DamageAssessment')(sequelize, Sequelize);
db.Communication = require('./Communication')(sequelize, Sequelize);
db.WeatherAlert = require('./WeatherAlert')(sequelize, Sequelize);
db.Donation = require('./Donation')(sequelize, Sequelize);
db.MedicalResource = require('./MedicalResource')(sequelize, Sequelize);
db.SearchRescue = require('./SearchRescue')(sequelize, Sequelize);
db.Infrastructure = require('./Infrastructure')(sequelize, Sequelize);
db.ThreatAnalysis = require('./ThreatAnalysis')(sequelize, Sequelize);

// Associations
db.Resource.belongsTo(db.Incident, { foreignKey: 'assignedIncidentId', as: 'incident' });
db.Incident.hasMany(db.Resource, { foreignKey: 'assignedIncidentId', as: 'resources' });

db.Volunteer.belongsTo(db.Incident, { foreignKey: 'assignedIncidentId', as: 'incident' });
db.Incident.hasMany(db.Volunteer, { foreignKey: 'assignedIncidentId', as: 'volunteers' });

db.Evacuation.belongsTo(db.Incident, { foreignKey: 'incidentId', as: 'incident' });
db.Incident.hasMany(db.Evacuation, { foreignKey: 'incidentId', as: 'evacuations' });

db.DamageAssessment.belongsTo(db.Incident, { foreignKey: 'incidentId', as: 'incident' });
db.Incident.hasMany(db.DamageAssessment, { foreignKey: 'incidentId', as: 'damageAssessments' });

db.Communication.belongsTo(db.Incident, { foreignKey: 'incidentId', as: 'incident' });
db.Incident.hasMany(db.Communication, { foreignKey: 'incidentId', as: 'communications' });

db.MedicalResource.belongsTo(db.Incident, { foreignKey: 'assignedIncidentId', as: 'incident' });
db.Incident.hasMany(db.MedicalResource, { foreignKey: 'assignedIncidentId', as: 'medicalResources' });

db.SearchRescue.belongsTo(db.Incident, { foreignKey: 'incidentId', as: 'incident' });
db.Incident.hasMany(db.SearchRescue, { foreignKey: 'incidentId', as: 'searchRescueOps' });

db.Infrastructure.belongsTo(db.Incident, { foreignKey: 'incidentId', as: 'incident' });
db.Incident.hasMany(db.Infrastructure, { foreignKey: 'incidentId', as: 'infrastructure' });

module.exports = db;
