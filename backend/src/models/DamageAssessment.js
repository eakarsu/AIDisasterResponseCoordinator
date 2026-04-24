module.exports = (sequelize, Sequelize) => {
  const DamageAssessment = sequelize.define('DamageAssessment', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    location: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    incidentId: {
      type: Sequelize.INTEGER,
    },
    assessorName: {
      type: Sequelize.STRING,
    },
    damageLevel: {
      type: Sequelize.ENUM('minor', 'moderate', 'severe', 'catastrophic'),
      allowNull: false,
    },
    structuralDamage: {
      type: Sequelize.TEXT,
    },
    infrastructureDamage: {
      type: Sequelize.TEXT,
    },
    estimatedCost: {
      type: Sequelize.FLOAT,
    },
    photosUrl: {
      type: Sequelize.STRING,
    },
    status: {
      type: Sequelize.ENUM('pending', 'in_progress', 'completed'),
      defaultValue: 'pending',
    },
    recommendations: {
      type: Sequelize.TEXT,
    },
    assessmentDate: {
      type: Sequelize.DATE,
    },
  }, {
    timestamps: true,
  });

  return DamageAssessment;
};
