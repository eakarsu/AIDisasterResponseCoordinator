module.exports = (sequelize, Sequelize) => {
  const Evacuation = sequelize.define('Evacuation', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    zone: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    routeName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('planned', 'active', 'completed', 'cancelled'),
      defaultValue: 'planned',
    },
    priority: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
    },
    estimatedPopulation: {
      type: Sequelize.INTEGER,
    },
    evacuatedCount: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    destination: {
      type: Sequelize.STRING,
    },
    startTime: {
      type: Sequelize.DATE,
    },
    endTime: {
      type: Sequelize.DATE,
    },
    transportMode: {
      type: Sequelize.STRING,
    },
    notes: {
      type: Sequelize.TEXT,
    },
    incidentId: {
      type: Sequelize.INTEGER,
    },
  }, {
    timestamps: true,
  });

  return Evacuation;
};
