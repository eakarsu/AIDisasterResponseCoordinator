const db = require('../models');
const Resource = db.Resource;

const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Resource.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resources.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found.' });
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resource.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const resource = await Resource.create(req.body);
    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create resource.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found.' });
    await resource.update(req.body);
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update resource.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found.' });
    await resource.destroy();
    res.json({ message: 'Resource deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete resource.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
