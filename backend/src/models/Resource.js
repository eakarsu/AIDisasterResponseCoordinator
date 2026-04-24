module.exports = (sequelize, Sequelize) => {
  const Resource = sequelize.define('Resource', {
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
      type: Sequelize.ENUM('vehicle', 'equipment', 'personnel', 'aircraft', 'boat'),
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('available', 'deployed', 'maintenance', 'unavailable'),
      defaultValue: 'available',
    },
    quantity: {
      type: Sequelize.INTEGER,
      defaultValue: 1,
    },
    location: {
      type: Sequelize.STRING,
    },
    assignedIncidentId: {
      type: Sequelize.INTEGER,
    },
    condition: {
      type: Sequelize.STRING,
    },
    costPerUnit: {
      type: Sequelize.FLOAT,
    },
    lastInspection: {
      type: Sequelize.DATE,
    },
  }, {
    timestamps: true,
  });

  return Resource;
};
