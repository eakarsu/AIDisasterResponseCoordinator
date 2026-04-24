module.exports = (sequelize, Sequelize) => {
  const Communication = sequelize.define('Communication', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: Sequelize.ENUM('alert', 'update', 'request', 'broadcast'),
      allowNull: false,
    },
    priority: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
    },
    subject: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    sender: {
      type: Sequelize.STRING,
    },
    recipients: {
      type: Sequelize.JSON,
      defaultValue: [],
    },
    channel: {
      type: Sequelize.ENUM('radio', 'email', 'sms', 'satellite', 'app'),
      defaultValue: 'app',
    },
    status: {
      type: Sequelize.ENUM('sent', 'delivered', 'read', 'failed'),
      defaultValue: 'sent',
    },
    incidentId: {
      type: Sequelize.INTEGER,
    },
    timestamp: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
  }, {
    timestamps: true,
  });

  return Communication;
};
