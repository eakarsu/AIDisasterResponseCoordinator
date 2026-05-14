const router = require('express').Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');

router.use(auth);

router.post('/analyze-threat', aiRateLimiter, aiController.analyzeThreat);
router.post('/generate-evacuation-plan', aiRateLimiter, aiController.generateEvacuationPlan);
router.post('/assess-damage', aiRateLimiter, aiController.assessDamage);
router.post('/predict-weather', aiRateLimiter, aiController.predictWeather);
router.post('/optimize-resources', aiRateLimiter, aiController.optimizeResources);
router.post('/generate-report', aiRateLimiter, aiController.generateReport);
router.post('/triage-medical', aiRateLimiter, aiController.triageMedical);
router.post('/search-strategy', aiRateLimiter, aiController.searchStrategy);

module.exports = router;
