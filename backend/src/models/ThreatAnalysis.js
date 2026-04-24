module.exports = (sequelize, Sequelize) => {
  const ThreatAnalysis = sequelize.define('ThreatAnalysis', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    threatType: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    region: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    riskLevel: {
      type: Sequelize.ENUM('low', 'moderate', 'high', 'extreme'),
      allowNull: false,
    },
    probability: {
      type: Sequelize.FLOAT,
    },
    potentialImpact: {
      type: Sequelize.TEXT,
    },
    affectedPopulation: {
      type: Sequelize.INTEGER,
    },
    description: {
      type: Sequelize.TEXT,
    },
    mitigationSteps: {
      type: Sequelize.JSON,
      defaultValue: [],
    },
    status: {
      type: Sequelize.ENUM('identified', 'monitoring', 'escalated', 'mitigated'),
      defaultValue: 'identified',
    },
    analyzedBy: {
      type: Sequelize.STRING,
    },
    analysisDate: {
      type: Sequelize.DATE,
    },
    aiConfidence: {
      type: Sequelize.FLOAT,
    },
  }, {
    timestamps: true,
  });

  return ThreatAnalysis;
};
