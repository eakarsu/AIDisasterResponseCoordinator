// Earthquake/Tsunami Early Warning System (EEWS) Models
module.exports = (sequelize, Sequelize) => {
  // ── SeismicFeed ─────────────────────────────────────────────────────────────
  const SeismicFeed = sequelize.define('SeismicFeed', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    stationCode: { type: Sequelize.STRING, allowNull: false },
    networkCode: { type: Sequelize.STRING, allowNull: false },
    channelCode: { type: Sequelize.STRING },
    locationCode: { type: Sequelize.STRING },
    protocol: { type: Sequelize.ENUM('FDSN', 'SeedLink', 'miniSEED', 'IRIS', 'other'), defaultValue: 'FDSN' },
    feedUrl: { type: Sequelize.STRING },
    latitude: { type: Sequelize.FLOAT },
    longitude: { type: Sequelize.FLOAT },
    elevation: { type: Sequelize.FLOAT },
    sampleRate: { type: Sequelize.FLOAT },
    instrumentType: { type: Sequelize.ENUM('broadband', 'short_period', 'strong_motion', 'MEMS', 'infrasound', 'other'), defaultValue: 'broadband' },
    status: { type: Sequelize.ENUM('active', 'degraded', 'offline', 'maintenance', 'archived'), defaultValue: 'active' },
    lastHeartbeat: { type: Sequelize.DATE },
    latencyMs: { type: Sequelize.FLOAT },
    gapCount: { type: Sequelize.INTEGER, defaultValue: 0 },
    noiseLevel: { type: Sequelize.FLOAT },
    qualityScore: { type: Sequelize.FLOAT },
    metadataJson: { type: Sequelize.TEXT },
    calibrationDate: { type: Sequelize.DATE },
    operatorOrg: { type: Sequelize.STRING },
    backupStationCode: { type: Sequelize.STRING },
    aiHealthNotes: { type: Sequelize.TEXT },
  }, { tableName: 'eews_seismic_feeds', timestamps: true, paranoid: false });

  // ── PWaveEvent ───────────────────────────────────────────────────────────────
  const PWaveEvent = sequelize.define('PWaveEvent', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    seismicFeedId: { type: Sequelize.INTEGER },
    eventCode: { type: Sequelize.STRING },
    region: { type: Sequelize.STRING },
    latitude: { type: Sequelize.FLOAT },
    longitude: { type: Sequelize.FLOAT },
    depth: { type: Sequelize.FLOAT },
    pArrivalTime: { type: Sequelize.DATE },
    sArrivalTime: { type: Sequelize.DATE },
    staltaRatio: { type: Sequelize.FLOAT },
    pickConfidence: { type: Sequelize.FLOAT },
    preliminaryMagnitude: { type: Sequelize.FLOAT },
    finalMagnitude: { type: Sequelize.FLOAT },
    magnitudeType: { type: Sequelize.ENUM('Ml', 'Mb', 'Ms', 'Mw', 'Md', 'other'), defaultValue: 'Mw' },
    eventType: { type: Sequelize.ENUM('tectonic', 'volcanic', 'induced', 'explosion', 'noise', 'unknown'), defaultValue: 'tectonic' },
    sourceMechanism: { type: Sequelize.STRING },
    stationsUsed: { type: Sequelize.INTEGER },
    detectionLatencyMs: { type: Sequelize.FLOAT },
    isFalsePick: { type: Sequelize.BOOLEAN, defaultValue: false },
    status: { type: Sequelize.ENUM('detected', 'confirmed', 'revised', 'archived', 'cancelled'), defaultValue: 'detected' },
    bulletinText: { type: Sequelize.TEXT },
    aftershockProbability: { type: Sequelize.FLOAT },
    aiNarrative: { type: Sequelize.TEXT },
  }, { tableName: 'eews_pwave_events', timestamps: true, paranoid: false });

  // ── TsunamiModel ─────────────────────────────────────────────────────────────
  const TsunamiModel = sequelize.define('TsunamiModel', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    pWaveEventId: { type: Sequelize.INTEGER },
    region: { type: Sequelize.STRING, allowNull: false },
    sourceType: { type: Sequelize.ENUM('subduction', 'strike_slip', 'landslide', 'volcanic', 'unknown'), defaultValue: 'subduction' },
    waveInitiationTime: { type: Sequelize.DATE },
    modelRunAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    estimatedMaxRunup: { type: Sequelize.FLOAT },
    wavePeriodSeconds: { type: Sequelize.FLOAT },
    coastalArrivalJson: { type: Sequelize.TEXT },
    bathymetryDataset: { type: Sequelize.STRING },
    modelConfidence: { type: Sequelize.FLOAT },
    warningLevel: { type: Sequelize.ENUM('information', 'watch', 'advisory', 'warning', 'major_warning'), defaultValue: 'watch' },
    status: { type: Sequelize.ENUM('modelling', 'issued', 'updated', 'cancelled', 'archived'), defaultValue: 'modelling' },
    secondWaveEta: { type: Sequelize.DATE },
    historicalEventRef: { type: Sequelize.STRING },
    evacuationZonesJson: { type: Sequelize.TEXT },
    buoyObservationsJson: { type: Sequelize.TEXT },
    bulletinText: { type: Sequelize.TEXT },
    aiImpactSummary: { type: Sequelize.TEXT },
  }, { tableName: 'eews_tsunami_models', timestamps: true, paranoid: false });

  // ── AlertDispatch ─────────────────────────────────────────────────────────────
  const AlertDispatch = sequelize.define('AlertDispatch', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    pWaveEventId: { type: Sequelize.INTEGER },
    tsunamiModelId: { type: Sequelize.INTEGER },
    region: { type: Sequelize.STRING, allowNull: false },
    alertType: { type: Sequelize.ENUM('earthquake', 'tsunami', 'combined'), defaultValue: 'earthquake' },
    targetPopulationGroup: { type: Sequelize.ENUM('general', 'mobility_impaired', 'non_english', 'marine', 'schools', 'hospitals'), defaultValue: 'general' },
    alertChannel: { type: Sequelize.ENUM('cell_broadcast', 'wireless_emergency', 'app_push', 'radio', 'TV', 'social_media'), defaultValue: 'wireless_emergency' },
    alertText: { type: Sequelize.TEXT },
    languageCode: { type: Sequelize.STRING, defaultValue: 'en' },
    predictedShakingMmi: { type: Sequelize.FLOAT },
    coveragePercent: { type: Sequelize.FLOAT },
    dispatchedAt: { type: Sequelize.DATE },
    acknowledgedCount: { type: Sequelize.INTEGER, defaultValue: 0 },
    fatigueFlagged: { type: Sequelize.BOOLEAN, defaultValue: false },
    status: { type: Sequelize.ENUM('pending', 'dispatched', 'delivered', 'failed', 'cancelled', 'archived'), defaultValue: 'pending' },
    rebroadcastAt: { type: Sequelize.DATE },
    effectivenessScore: { type: Sequelize.FLOAT },
    aiFollowupText: { type: Sequelize.TEXT },
  }, { tableName: 'eews_alert_dispatches', timestamps: true, paranoid: false });

  // ── SirenActivation ───────────────────────────────────────────────────────────
  const SirenActivation = sequelize.define('SirenActivation', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    pWaveEventId: { type: Sequelize.INTEGER },
    sirenId: { type: Sequelize.STRING, allowNull: false },
    sirenLocation: { type: Sequelize.STRING },
    latitude: { type: Sequelize.FLOAT },
    longitude: { type: Sequelize.FLOAT },
    triggerSource: { type: Sequelize.ENUM('auto_eew', 'shakealert', 'operator', 'test', 'manual'), defaultValue: 'auto_eew' },
    tonePattern: { type: Sequelize.ENUM('alert', 'all_clear', 'evacuation', 'test', 'attack'), defaultValue: 'alert' },
    eventSeverity: { type: Sequelize.ENUM('minor', 'moderate', 'strong', 'major', 'great'), defaultValue: 'moderate' },
    activatedAt: { type: Sequelize.DATE },
    deactivatedAt: { type: Sequelize.DATE },
    durationSeconds: { type: Sequelize.INTEGER },
    acousticCoverageM: { type: Sequelize.FLOAT },
    relayStuck: { type: Sequelize.BOOLEAN, defaultValue: false },
    maintenanceDue: { type: Sequelize.DATE },
    status: { type: Sequelize.ENUM('standby', 'active', 'test', 'fault', 'decommissioned', 'archived'), defaultValue: 'standby' },
    readinessScore: { type: Sequelize.FLOAT },
    aiPlacementNotes: { type: Sequelize.TEXT },
  }, { tableName: 'eews_siren_activations', timestamps: true, paranoid: false });

  // ── ShakeAlertMessage ─────────────────────────────────────────────────────────
  const ShakeAlertMessage = sequelize.define('ShakeAlertMessage', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    pWaveEventId: { type: Sequelize.INTEGER },
    messageId: { type: Sequelize.STRING },
    source: { type: Sequelize.ENUM('USGS_ShakeAlert', 'JMA', 'KMA', 'EMSC', 'regional', 'other'), defaultValue: 'USGS_ShakeAlert' },
    rawCapXml: { type: Sequelize.TEXT },
    eventQualityBand: { type: Sequelize.ENUM('A', 'B', 'C', 'D', 'unknown'), defaultValue: 'unknown' },
    magnitude: { type: Sequelize.FLOAT },
    latitude: { type: Sequelize.FLOAT },
    longitude: { type: Sequelize.FLOAT },
    depth: { type: Sequelize.FLOAT },
    originTime: { type: Sequelize.DATE },
    receivedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    endToEndLatencyMs: { type: Sequelize.FLOAT },
    isDuplicate: { type: Sequelize.BOOLEAN, defaultValue: false },
    revisionNeeded: { type: Sequelize.BOOLEAN, defaultValue: false },
    suppressedDownstream: { type: Sequelize.BOOLEAN, defaultValue: false },
    translatedCapJson: { type: Sequelize.TEXT },
    regionalMapping: { type: Sequelize.STRING },
    failoverSource: { type: Sequelize.STRING },
    reliabilityScore: { type: Sequelize.FLOAT },
    status: { type: Sequelize.ENUM('received', 'validated', 'translated', 'republished', 'suppressed', 'archived'), defaultValue: 'received' },
    aiOperatorNarrative: { type: Sequelize.TEXT },
  }, { tableName: 'eews_shakealert_messages', timestamps: true, paranoid: false });

  // ── Associations ──────────────────────────────────────────────────────────────
  SeismicFeed.hasMany(PWaveEvent, { foreignKey: 'seismicFeedId', as: 'pWaveEvents' });
  PWaveEvent.belongsTo(SeismicFeed, { foreignKey: 'seismicFeedId', as: 'seismicFeed' });

  PWaveEvent.hasMany(TsunamiModel, { foreignKey: 'pWaveEventId', as: 'tsunamiModels' });
  TsunamiModel.belongsTo(PWaveEvent, { foreignKey: 'pWaveEventId', as: 'pWaveEvent' });

  PWaveEvent.hasMany(AlertDispatch, { foreignKey: 'pWaveEventId', as: 'alertDispatches' });
  AlertDispatch.belongsTo(PWaveEvent, { foreignKey: 'pWaveEventId', as: 'pWaveEvent' });

  TsunamiModel.hasMany(AlertDispatch, { foreignKey: 'tsunamiModelId', as: 'alertDispatches' });
  AlertDispatch.belongsTo(TsunamiModel, { foreignKey: 'tsunamiModelId', as: 'tsunamiModel' });

  PWaveEvent.hasMany(SirenActivation, { foreignKey: 'pWaveEventId', as: 'sirenActivations' });
  SirenActivation.belongsTo(PWaveEvent, { foreignKey: 'pWaveEventId', as: 'pWaveEvent' });

  PWaveEvent.hasMany(ShakeAlertMessage, { foreignKey: 'pWaveEventId', as: 'shakeAlertMessages' });
  ShakeAlertMessage.belongsTo(PWaveEvent, { foreignKey: 'pWaveEventId', as: 'pWaveEvent' });

  return { SeismicFeed, PWaveEvent, TsunamiModel, AlertDispatch, SirenActivation, ShakeAlertMessage };
};
