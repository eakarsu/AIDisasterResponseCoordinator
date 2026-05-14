const db = require('../models');
const Shelter = db.Shelter;

const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Shelter.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shelters.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const shelter = await Shelter.findByPk(req.params.id);
    if (!shelter) return res.status(404).json({ error: 'Shelter not found.' });
    res.json(shelter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shelter.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const shelter = await Shelter.create(req.body);
    res.status(201).json(shelter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create shelter.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const shelter = await Shelter.findByPk(req.params.id);
    if (!shelter) return res.status(404).json({ error: 'Shelter not found.' });
    await shelter.update(req.body);
    res.json(shelter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shelter.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const shelter = await Shelter.findByPk(req.params.id);
    if (!shelter) return res.status(404).json({ error: 'Shelter not found.' });
    await shelter.destroy();
    res.json({ message: 'Shelter deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shelter.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
