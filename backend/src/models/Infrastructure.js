module.exports = (sequelize, Sequelize) => {
  const Infrastructure = sequelize.define('Infrastructure', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM('bridge', 'road', 'power_grid', 'water_system', 'communication_tower', 'hospital', 'school', 'government_building'),
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('operational', 'damaged', 'destroyed', 'under_repair', 'offline'),
      defaultValue: 'operational',
    },
    location: {
      type: Sequelize.STRING,
    },
    lastInspected: {
      type: Sequelize.DATE,
    },
    damageLevel: {
      type: Sequelize.ENUM('none', 'minor', 'moderate', 'severe', 'destroyed'),
      defaultValue: 'none',
    },
    repairEstimate: {
      type: Sequelize.FLOAT,
    },
    priority: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
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

  return Infrastructure;
};
