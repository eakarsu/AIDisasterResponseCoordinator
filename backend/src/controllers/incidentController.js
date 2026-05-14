const db = require('../models');
const Incident = db.Incident;

const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Incident.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    });
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
    const { title, type, severity, location } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'title is required.' });
    }
    const validTypes = ['earthquake', 'hurricane', 'flood', 'wildfire', 'tornado', 'tsunami', 'pandemic', 'chemical_spill'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: `type is required and must be one of: ${validTypes.join(', ')}.` });
    }
    if (!severity || isNaN(severity) || severity < 1 || severity > 5) {
      return res.status(400).json({ error: 'severity is required and must be a number between 1 and 5.' });
    }
    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      return res.status(400).json({ error: 'location is required.' });
    }

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
