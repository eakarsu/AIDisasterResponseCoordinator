const db = require('../models');
const Infrastructure = db.Infrastructure;

const getAll = async (req, res) => {
  try {
    const items = await Infrastructure.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch infrastructure.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const item = await Infrastructure.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Infrastructure not found.' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch infrastructure.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const item = await Infrastructure.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create infrastructure.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const item = await Infrastructure.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Infrastructure not found.' });
    await item.update(req.body);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update infrastructure.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const item = await Infrastructure.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Infrastructure not found.' });
    await item.destroy();
    res.json({ message: 'Infrastructure deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete infrastructure.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
