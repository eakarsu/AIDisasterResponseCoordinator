module.exports = (sequelize, Sequelize) => {
  const Shelter = sequelize.define('Shelter', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    address: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    capacity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    currentOccupancy: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: Sequelize.ENUM('open', 'closed', 'full', 'preparing'),
      defaultValue: 'preparing',
    },
    type: {
      type: Sequelize.ENUM('emergency', 'temporary', 'permanent'),
      defaultValue: 'emergency',
    },
    amenities: {
      type: Sequelize.JSON,
    },
    contactPerson: {
      type: Sequelize.STRING,
    },
    contactPhone: {
      type: Sequelize.STRING,
    },
    latitude: {
      type: Sequelize.FLOAT,
    },
    longitude: {
      type: Sequelize.FLOAT,
    },
  }, {
    timestamps: true,
  });

  return Shelter;
};
