
const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');
const router = express.Router();

router.post('/create-admin', auth(0), userController.createAdmin);
router.post('/create-clerk', auth(1), userController.createClerk);
router.post('/create-guest', userController.createGuest);

router.post('/update-user', auth(), userController.updateUser);

router.post('/check-token', auth(), authController.checkToken);
router.post('/login', authController.login);
router.post('/logout', auth(), authController.logout);

router.post('/get-admin', auth(0), userController.getAdminList);
router.post('/get-clerk-by-cafe-id', auth(1), userController.getClerkByCafeId);

module.exports = router;