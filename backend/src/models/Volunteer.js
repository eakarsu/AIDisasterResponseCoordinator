module.exports = (sequelize, Sequelize) => {
  const Volunteer = sequelize.define('Volunteer', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    phone: {
      type: Sequelize.STRING,
    },
    skills: {
      type: Sequelize.JSON,
      defaultValue: [],
    },
    availability: {
      type: Sequelize.ENUM('available', 'deployed', 'unavailable'),
      defaultValue: 'available',
    },
    certifications: {
      type: Sequelize.JSON,
      defaultValue: [],
    },
    hoursLogged: {
      type: Sequelize.FLOAT,
      defaultValue: 0,
    },
    assignedIncidentId: {
      type: Sequelize.INTEGER,
    },
    location: {
      type: Sequelize.STRING,
    },
    emergencyContact: {
      type: Sequelize.STRING,
    },
  }, {
    timestamps: true,
  });

  return Volunteer;
};
