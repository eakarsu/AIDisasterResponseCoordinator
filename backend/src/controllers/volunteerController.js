const db = require('../models');
const Volunteer = db.Volunteer;

const getAll = async (req, res) => {
  try {
    const volunteers = await Volunteer.findAll({ order: [['createdAt', 'DESC']] });
    res.json(volunteers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch volunteers.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const volunteer = await Volunteer.findByPk(req.params.id);
    if (!volunteer) return res.status(404).json({ error: 'Volunteer not found.' });
    res.json(volunteer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch volunteer.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const volunteer = await Volunteer.create(req.body);
    res.status(201).json(volunteer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create volunteer.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const volunteer = await Volunteer.findByPk(req.params.id);
    if (!volunteer) return res.status(404).json({ error: 'Volunteer not found.' });
    await volunteer.update(req.body);
    res.json(volunteer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update volunteer.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const volunteer = await Volunteer.findByPk(req.params.id);
    if (!volunteer) return res.status(404).json({ error: 'Volunteer not found.' });
    await volunteer.destroy();
    res.json({ message: 'Volunteer deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete volunteer.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
