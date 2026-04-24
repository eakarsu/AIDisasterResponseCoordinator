const db = require('../models');
const Donation = db.Donation;

const getAll = async (req, res) => {
  try {
    const donations = await Donation.findAll({ order: [['createdAt', 'DESC']] });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donations.', message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id);
    if (!donation) return res.status(404).json({ error: 'Donation not found.' });
    res.json(donation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donation.', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const donation = await Donation.create(req.body);
    res.status(201).json(donation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create donation.', message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id);
    if (!donation) return res.status(404).json({ error: 'Donation not found.' });
    await donation.update(req.body);
    res.json(donation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update donation.', message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id);
    if (!donation) return res.status(404).json({ error: 'Donation not found.' });
    await donation.destroy();
    res.json({ message: 'Donation deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete donation.', message: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
