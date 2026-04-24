const db = require('../models');
const Incident = db.Incident;

const getAll = async (req, res) => {
  try {
    const incidents = await Incident.findAll({ order: [['createdAt', 'DESC']] });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incidents.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found.' });
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incident.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const incident = await Incident.create(req.body);
    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create incident.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found.' });
    await incident.update(req.body);
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update incident.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found.' });
    await incident.destroy();
    res.json({ message: 'Incident deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete incident.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
