const db = require('../models');
const MedicalResource = db.MedicalResource;

const getAll = async (req, res) => {
  try {
    const resources = await MedicalResource.findAll({ order: [['createdAt', 'DESC']] });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch medical resources.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const resource = await MedicalResource.findByPk(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Medical resource not found.' });
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch medical resource.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const resource = await MedicalResource.create(req.body);
    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create medical resource.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const resource = await MedicalResource.findByPk(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Medical resource not found.' });
    await resource.update(req.body);
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update medical resource.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const resource = await MedicalResource.findByPk(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Medical resource not found.' });
    await resource.destroy();
    res.json({ message: 'Medical resource deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete medical resource.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
