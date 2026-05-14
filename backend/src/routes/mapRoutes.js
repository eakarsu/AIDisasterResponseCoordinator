const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../models');

router.use(auth);

/**
 * GET /api/map/geo
 * Returns a GeoJSON FeatureCollection of all incidents, shelters, and resources
 * with valid lat/lng for live map rendering.
 *
 * Query: ?incidentStatus=active (optional filter)
 */
router.get('/geo', async (req, res) => {
  try {
    const incidentWhere = {};
    if (req.query.incidentStatus) incidentWhere.status = req.query.incidentStatus;

    const [incidents, shelters, resources] = await Promise.all([
      db.Incident.findAll({ where: incidentWhere }),
      db.Shelter.findAll(),
      db.Resource.findAll(),
    ]);

    const features = [];

    for (const inc of incidents) {
      if (inc.latitude == null || inc.longitude == null) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(inc.longitude), Number(inc.latitude)] },
        properties: {
          kind: 'incident',
          id: inc.id,
          title: inc.title,
          incidentType: inc.type,
          severity: inc.severity,
          status: inc.status,
          location: inc.location,
          affectedPopulation: inc.affectedPopulation,
        },
      });
    }

    for (const sh of shelters) {
      if (sh.latitude == null || sh.longitude == null) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(sh.longitude), Number(sh.latitude)] },
        properties: {
          kind: 'shelter',
          id: sh.id,
          name: sh.name,
          capacity: sh.capacity,
          currentOccupancy: sh.currentOccupancy,
          status: sh.status,
        },
      });
    }

    for (const r of resources) {
      if (r.latitude == null || r.longitude == null) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(r.longitude), Number(r.latitude)] },
        properties: {
          kind: 'resource',
          id: r.id,
          name: r.name,
          resourceType: r.type,
          quantity: r.quantity,
          status: r.status,
        },
      });
    }

    res.json({
      type: 'FeatureCollection',
      features,
      counts: {
        incidents: features.filter((f) => f.properties.kind === 'incident').length,
        shelters: features.filter((f) => f.properties.kind === 'shelter').length,
        resources: features.filter((f) => f.properties.kind === 'resource').length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to build map data.', message: error.message });
  }
});

/**
 * GET /api/map/bounds
 * Returns recommended map bounds (sw, ne) based on existing geo points.
 */
router.get('/bounds', async (req, res) => {
  try {
    const incidents = await db.Incident.findAll({
      where: { latitude: { [db.Sequelize.Op.ne]: null }, longitude: { [db.Sequelize.Op.ne]: null } },
      attributes: ['latitude', 'longitude'],
    });
    if (incidents.length === 0) {
      return res.json({ sw: [-125, 24], ne: [-66, 49] }); // continental US default
    }
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const i of incidents) {
      const lat = Number(i.latitude); const lng = Number(i.longitude);
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
    }
    res.json({ sw: [minLng, minLat], ne: [maxLng, maxLat] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute bounds.', message: error.message });
  }
});

module.exports = router;
