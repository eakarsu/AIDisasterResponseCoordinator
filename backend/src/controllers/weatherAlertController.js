const db = require('../models');
const WeatherAlert = db.WeatherAlert;

const getAll = async (req, res) => {
  try {
    const alerts = await WeatherAlert.findAll({ order: [['createdAt', 'DESC']] });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather alerts.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const alert = await WeatherAlert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Weather alert not found.' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather alert.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const alert = await WeatherAlert.create(req.body);
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create weather alert.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const alert = await WeatherAlert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Weather alert not found.' });
    await alert.update(req.body);
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update weather alert.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const alert = await WeatherAlert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Weather alert not found.' });
    await alert.destroy();
    res.json({ message: 'Weather alert deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete weather alert.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
