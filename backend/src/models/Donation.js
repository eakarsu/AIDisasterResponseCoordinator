module.exports = (sequelize, Sequelize) => {
  const Donation = sequelize.define('Donation', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    donorName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    donorEmail: {
      type: Sequelize.STRING,
      validate: { isEmail: true },
    },
    type: {
      type: Sequelize.ENUM('monetary', 'supplies', 'services'),
      allowNull: false,
    },
    amount: {
      type: Sequelize.FLOAT,
    },
    currency: {
      type: Sequelize.STRING,
      defaultValue: 'USD',
    },
    itemDescription: {
      type: Sequelize.TEXT,
    },
    status: {
      type: Sequelize.ENUM('pledged', 'received', 'distributed', 'acknowledged'),
      defaultValue: 'pledged',
    },
    receivedDate: {
      type: Sequelize.DATE,
    },
    distributedDate: {
      type: Sequelize.DATE,
    },
    taxReceiptSent: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    notes: {
      type: Sequelize.TEXT,
    },
  }, {
    timestamps: true,
  });

  return Donation;
};
