const db = require('../models');
const ThreatAnalysis = db.ThreatAnalysis;

const getAll = async (req, res) => {
  try {
    const analyses = await ThreatAnalysis.findAll({ order: [['createdAt', 'DESC']] });
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch threat analyses.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const analysis = await ThreatAnalysis.findByPk(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Threat analysis not found.' });
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch threat analysis.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const analysis = await ThreatAnalysis.create(req.body);
    res.status(201).json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create threat analysis.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const analysis = await ThreatAnalysis.findByPk(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Threat analysis not found.' });
    await analysis.update(req.body);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update threat analysis.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const analysis = await ThreatAnalysis.findByPk(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Threat analysis not found.' });
    await analysis.destroy();
    res.json({ message: 'Threat analysis deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete threat analysis.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
