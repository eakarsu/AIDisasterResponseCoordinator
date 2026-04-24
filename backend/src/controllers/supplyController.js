const db = require('../models');
const Supply = db.Supply;

const getAll = async (req, res) => {
  try {
    const supplies = await Supply.findAll({ order: [['createdAt', 'DESC']] });
    res.json(supplies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch supplies.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const supply = await Supply.findByPk(req.params.id);
    if (!supply) return res.status(404).json({ error: 'Supply not found.' });
    res.json(supply);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch supply.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const supply = await Supply.create(req.body);
    res.status(201).json(supply);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supply.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const supply = await Supply.findByPk(req.params.id);
    if (!supply) return res.status(404).json({ error: 'Supply not found.' });
    await supply.update(req.body);
    res.json(supply);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update supply.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const supply = await Supply.findByPk(req.params.id);
    if (!supply) return res.status(404).json({ error: 'Supply not found.' });
    await supply.destroy();
    res.json({ message: 'Supply deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete supply.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
