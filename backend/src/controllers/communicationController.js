const db = require('../models');
const Communication = db.Communication;

const getAll = async (req, res) => {
  try {
    const communications = await Communication.findAll({ order: [['createdAt', 'DESC']] });
    res.json(communications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch communications.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const communication = await Communication.findByPk(req.params.id);
    if (!communication) return res.status(404).json({ error: 'Communication not found.' });
    res.json(communication);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch communication.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const communication = await Communication.create(req.body);
    res.status(201).json(communication);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create communication.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const communication = await Communication.findByPk(req.params.id);
    if (!communication) return res.status(404).json({ error: 'Communication not found.' });
    await communication.update(req.body);
    res.json(communication);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update communication.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const communication = await Communication.findByPk(req.params.id);
    if (!communication) return res.status(404).json({ error: 'Communication not found.' });
    await communication.destroy();
    res.json({ message: 'Communication deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete communication.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
