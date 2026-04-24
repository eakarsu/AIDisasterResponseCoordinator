const db = require('../models');
const Evacuation = db.Evacuation;

const getAll = async (req, res) => {
  try {
    const evacuations = await Evacuation.findAll({ order: [['createdAt', 'DESC']] });
    res.json(evacuations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch evacuations.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const evacuation = await Evacuation.findByPk(req.params.id);
    if (!evacuation) return res.status(404).json({ error: 'Evacuation not found.' });
    res.json(evacuation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch evacuation.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const evacuation = await Evacuation.create(req.body);
    res.status(201).json(evacuation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create evacuation.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const evacuation = await Evacuation.findByPk(req.params.id);
    if (!evacuation) return res.status(404).json({ error: 'Evacuation not found.' });
    await evacuation.update(req.body);
    res.json(evacuation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update evacuation.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const evacuation = await Evacuation.findByPk(req.params.id);
    if (!evacuation) return res.status(404).json({ error: 'Evacuation not found.' });
    await evacuation.destroy();
    res.json({ message: 'Evacuation deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete evacuation.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
