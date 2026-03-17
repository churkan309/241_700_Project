const router = require('express').Router();
const { getUser, updateUser, deleteUser } = require('../controllers/user.controller');
const { requireSelf } = require('../middleware/auth');

router.get   ('/:userId', requireSelf, getUser);
router.put   ('/:userId', requireSelf, updateUser);
router.delete('/:userId', requireSelf, deleteUser);

module.exports = router;
