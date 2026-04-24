const router = require('express').Router();
const controller = require('../controllers/evacuationController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
