const db = require('../models');
const DamageAssessment = db.DamageAssessment;

const getAll = async (req, res) => {
  try {
    const assessments = await DamageAssessment.findAll({ order: [['createdAt', 'DESC']] });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch damage assessments.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const assessment = await DamageAssessment.findByPk(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Damage assessment not found.' });
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch damage assessment.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const assessment = await DamageAssessment.create(req.body);
    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create damage assessment.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const assessment = await DamageAssessment.findByPk(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Damage assessment not found.' });
    await assessment.update(req.body);
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update damage assessment.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const assessment = await DamageAssessment.findByPk(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Damage assessment not found.' });
    await assessment.destroy();
    res.json({ message: 'Damage assessment deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete damage assessment.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
