
const express = require('express');
const cafeController = require('../controllers/cafeController');
const auth = require('../middlewares/auth');
const router = express.Router();

router.post('/get-cafe-by-userId', auth(0), cafeController.getCafeByUserId);
router.post('/get-my-cafe', auth(1), cafeController.getMyCafe);
router.post('/create-cafe', auth(1), cafeController.createCafe);
router.post('/update-cafe', auth(1), cafeController.updateCafe);

module.exports = router;