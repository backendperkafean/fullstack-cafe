// controllers/authController.js

const bcrypt = require('bcrypt');
const { User, Session } = require('../models');

//its an endpoint, its still needs auth.js
exports.checkToken = async (req, res) => {

  try {
    // passed the auth.js
    res.status(200).send({ user: req.user, valid: true });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller for user login
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username
    const user = await User.findOne({ where: { username } });
    
    // If user not found or password is incorrect, return error
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session ID
    const token = generateToken();

    // Create session record
    await Session.create({ userId: user.userId, token });

    // Return session ID
    res.json({ token, cafeId: user.cafeId });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller for user logout
exports.logout = async (req, res) => {
  try {
    // Delete session record
    await Session.update({ isValid: false }, { where: { token: req.session.token } });
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to generate session ID
function generateToken() {
  // Generate a random string as session ID
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
