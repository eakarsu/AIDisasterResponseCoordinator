const router = require('express').Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/analyze-threat', aiController.analyzeThreat);
router.post('/generate-evacuation-plan', aiController.generateEvacuationPlan);
router.post('/assess-damage', aiController.assessDamage);
router.post('/predict-weather', aiController.predictWeather);
router.post('/optimize-resources', aiController.optimizeResources);
router.post('/generate-report', aiController.generateReport);
router.post('/triage-medical', aiController.triageMedical);
router.post('/search-strategy', aiController.searchStrategy);

module.exports = router;
