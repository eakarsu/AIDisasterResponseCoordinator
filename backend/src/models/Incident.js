module.exports = (sequelize, Sequelize) => {
  const Incident = sequelize.define('Incident', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM('earthquake', 'hurricane', 'flood', 'wildfire', 'tornado', 'tsunami', 'pandemic', 'chemical_spill'),
      allowNull: false,
    },
    severity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    status: {
      type: Sequelize.ENUM('active', 'monitoring', 'resolved', 'closed'),
      defaultValue: 'active',
    },
    location: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    latitude: {
      type: Sequelize.FLOAT,
    },
    longitude: {
      type: Sequelize.FLOAT,
    },
    description: {
      type: Sequelize.TEXT,
    },
    affectedPopulation: {
      type: Sequelize.INTEGER,
    },
    startDate: {
      type: Sequelize.DATE,
    },
    endDate: {
      type: Sequelize.DATE,
    },
    commanderName: {
      type: Sequelize.STRING,
    },
    estimatedDamage: {
      type: Sequelize.FLOAT,
    },
  }, {
    timestamps: true,
  });

  return Incident;
};
