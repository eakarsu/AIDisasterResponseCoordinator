module.exports = (sequelize, Sequelize) => {
  const Supply = sequelize.define('Supply', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    category: {
      type: Sequelize.ENUM('food', 'water', 'medical', 'clothing', 'shelter', 'tools', 'fuel'),
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    unit: {
      type: Sequelize.STRING,
    },
    location: {
      type: Sequelize.STRING,
    },
    expirationDate: {
      type: Sequelize.DATE,
    },
    status: {
      type: Sequelize.ENUM('in_stock', 'low_stock', 'out_of_stock', 'in_transit'),
      defaultValue: 'in_stock',
    },
    reorderLevel: {
      type: Sequelize.INTEGER,
    },
    supplier: {
      type: Sequelize.STRING,
    },
    cost: {
      type: Sequelize.FLOAT,
    },
  }, {
    timestamps: true,
  });

  return Supply;
};
