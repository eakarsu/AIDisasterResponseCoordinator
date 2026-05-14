module.exports = (sequelize, Sequelize) => {
  const AiAnalysis = sequelize.define('AiAnalysis', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    analysis_type: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    reference_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    reference_type: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    input_summary: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    result_text: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    // Structured AI results stored as JSONB for queryable parsed output
    ai_results: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    model_used: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'anthropic/claude-3-5-sonnet-20241022',
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  }, {
    timestamps: true,
    tableName: 'ai_analyses',
  });

  return AiAnalysis;
};
