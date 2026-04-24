module.exports = (sequelize, Sequelize) => {
  const WeatherAlert = sequelize.define('WeatherAlert', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: Sequelize.ENUM('hurricane', 'tornado', 'flood', 'heat', 'winter', 'thunderstorm'),
      allowNull: false,
    },
    severity: {
      type: Sequelize.ENUM('advisory', 'watch', 'warning', 'emergency'),
      allowNull: false,
    },
    region: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
    },
    startTime: {
      type: Sequelize.DATE,
    },
    endTime: {
      type: Sequelize.DATE,
    },
    source: {
      type: Sequelize.STRING,
    },
    affectedAreas: {
      type: Sequelize.JSON,
      defaultValue: [],
    },
    windSpeed: {
      type: Sequelize.FLOAT,
    },
    precipitation: {
      type: Sequelize.FLOAT,
    },
    temperature: {
      type: Sequelize.FLOAT,
    },
    recommendations: {
      type: Sequelize.TEXT,
    },
  }, {
    timestamps: true,
  });

  return WeatherAlert;
};
