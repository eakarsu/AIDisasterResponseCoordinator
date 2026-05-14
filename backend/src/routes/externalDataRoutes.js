const router = require('express').Router();
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const db = require('../models');

router.use(auth);

/**
 * GET /api/external-data/usgs-earthquakes
 * Fetches significant earthquakes from USGS in last 24h.
 * Optional ?minMag=4 (default 2.5)
 */
router.get('/usgs-earthquakes', async (req, res) => {
  try {
    const minMag = parseFloat(req.query.minMag) || 2.5;
    const feed = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${minMag >= 4 ? '4.5' : minMag >= 2.5 ? '2.5' : 'all'}_day.geojson`;

    const r = await fetch(feed);
    if (!r.ok) {
      return res.status(502).json({ error: `USGS feed responded ${r.status}` });
    }
    const data = await r.json();

    const events = (data.features || []).filter((f) => (f.properties?.mag || 0) >= minMag).map((f) => ({
      id: f.id,
      mag: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      url: f.properties.url,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      depth_km: f.geometry.coordinates[2],
      tsunami: f.properties.tsunami === 1,
    }));

    res.json({
      source: 'usgs',
      fetched_at: new Date().toISOString(),
      count: events.length,
      events,
    });
  } catch (error) {
    res.status(500).json({ error: 'USGS fetch failed.', message: error.message });
  }
});

/**
 * GET /api/external-data/noaa-alerts
 * Fetches active NWS/NOAA weather alerts. Optional ?area=CA (state code).
 */
router.get('/noaa-alerts', async (req, res) => {
  try {
    const area = req.query.area;
    const url = area
      ? `https://api.weather.gov/alerts/active?area=${encodeURIComponent(area)}`
      : 'https://api.weather.gov/alerts/active';

    const r = await fetch(url, { headers: { 'User-Agent': 'AIDisasterResponseCoordinator/1.0 (ops@example.com)' } });
    if (!r.ok) {
      return res.status(502).json({ error: `NOAA feed responded ${r.status}` });
    }
    const data = await r.json();

    const alerts = (data.features || []).map((f) => ({
      id: f.id,
      event: f.properties.event,
      severity: f.properties.severity,
      urgency: f.properties.urgency,
      certainty: f.properties.certainty,
      headline: f.properties.headline,
      areaDesc: f.properties.areaDesc,
      sent: f.properties.sent,
      effective: f.properties.effective,
      expires: f.properties.expires,
      description: f.properties.description,
    }));

    res.json({
      source: 'noaa',
      area: area || 'US',
      fetched_at: new Date().toISOString(),
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    res.status(500).json({ error: 'NOAA fetch failed.', message: error.message });
  }
});

/**
 * POST /api/external-data/import-noaa-alerts
 * Pulls NOAA active alerts and inserts them as WeatherAlert rows
 * (skips ones already imported by id stored in 'externalId' field if present).
 */
router.post('/import-noaa-alerts', async (req, res) => {
  try {
    const area = req.body?.area;
    const url = area
      ? `https://api.weather.gov/alerts/active?area=${encodeURIComponent(area)}`
      : 'https://api.weather.gov/alerts/active';

    const r = await fetch(url, { headers: { 'User-Agent': 'AIDisasterResponseCoordinator/1.0 (ops@example.com)' } });
    if (!r.ok) return res.status(502).json({ error: `NOAA feed responded ${r.status}` });
    const data = await r.json();

    let inserted = 0;
    let skipped = 0;

    for (const f of (data.features || [])) {
      const props = f.properties;
      const exists = await db.WeatherAlert.findOne({ where: { title: (props.headline || props.event || 'Alert').substring(0, 250) } });
      if (exists) { skipped++; continue; }

      try {
        await db.WeatherAlert.create({
          title: (props.headline || props.event || 'NOAA Alert').substring(0, 250),
          alertType: (props.event || 'unknown').toLowerCase().replace(/\s+/g, '_').substring(0, 50),
          severity: props.severity || 'unknown',
          region: (props.areaDesc || 'unknown').substring(0, 250),
          description: props.description || '',
          startTime: props.effective || props.sent || new Date(),
          endTime: props.expires || null,
          source: 'NOAA',
          status: 'active',
        });
        inserted++;
      } catch (_) {
        // weather alert model may not have all these fields; skip
        skipped++;
      }
    }

    res.json({ inserted, skipped, total: (data.features || []).length });
  } catch (error) {
    res.status(500).json({ error: 'NOAA import failed.', message: error.message });
  }
});

module.exports = router;
