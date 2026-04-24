const db = require('../models');
const SearchRescue = db.SearchRescue;

const getAll = async (req, res) => {
  try {
    const operations = await SearchRescue.findAll({ order: [['createdAt', 'DESC']] });
    res.json(operations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch search & rescue operations.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const operation = await SearchRescue.findByPk(req.params.id);
    if (!operation) return res.status(404).json({ error: 'Search & rescue operation not found.' });
    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch search & rescue operation.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const operation = await SearchRescue.create(req.body);
    res.status(201).json(operation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create search & rescue operation.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const operation = await SearchRescue.findByPk(req.params.id);
    if (!operation) return res.status(404).json({ error: 'Search & rescue operation not found.' });
    await operation.update(req.body);
    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update search & rescue operation.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const operation = await SearchRescue.findByPk(req.params.id);
    if (!operation) return res.status(404).json({ error: 'Search & rescue operation not found.' });
    await operation.destroy();
    res.json({ message: 'Search & rescue operation deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete search & rescue operation.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
