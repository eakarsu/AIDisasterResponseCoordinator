module.exports = (sequelize, Sequelize) => {
  const SearchRescue = sequelize.define('SearchRescue', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    operationName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    incidentId: {
      type: Sequelize.INTEGER,
    },
    teamLeader: {
      type: Sequelize.STRING,
    },
    teamSize: {
      type: Sequelize.INTEGER,
    },
    searchArea: {
      type: Sequelize.STRING,
    },
    status: {
      type: Sequelize.ENUM('planning', 'active', 'suspended', 'completed'),
      defaultValue: 'planning',
    },
    personsFound: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    personsRescued: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    startTime: {
      type: Sequelize.DATE,
    },
    endTime: {
      type: Sequelize.DATE,
    },
    equipment: {
      type: Sequelize.JSON,
      defaultValue: [],
    },
    hazards: {
      type: Sequelize.TEXT,
    },
    notes: {
      type: Sequelize.TEXT,
    },
  }, {
    timestamps: true,
  });

  return SearchRescue;
};
