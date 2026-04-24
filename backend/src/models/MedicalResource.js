module.exports = (sequelize, Sequelize) => {
  const MedicalResource = sequelize.define('MedicalResource', {
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
      type: Sequelize.ENUM('ambulance', 'hospital_bed', 'ventilator', 'blood_supply', 'medication', 'ppe', 'first_aid'),
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    location: {
      type: Sequelize.STRING,
    },
    status: {
      type: Sequelize.ENUM('available', 'in_use', 'maintenance', 'depleted'),
      defaultValue: 'available',
    },
    assignedIncidentId: {
      type: Sequelize.INTEGER,
    },
    expirationDate: {
      type: Sequelize.DATE,
    },
    certificationRequired: {
      type: Sequelize.STRING,
    },
    supplier: {
      type: Sequelize.STRING,
    },
  }, {
    timestamps: true,
  });

  return MedicalResource;
};
