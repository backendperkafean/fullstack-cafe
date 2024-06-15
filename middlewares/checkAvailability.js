const { User } = require('../models');

async function checkAvailability(username, email) {
  const existingUser = await User.findOne({ where: { username } });

  if (existingUser) {
    return { 
        status: 400,
        message: 'Username already taken'
    };
  }

  const existingEmail = await User.findOne({ where: { email } });

  if (existingEmail) {
    return { 
        status: 400,
        message: 'Email already taken' 
    };
  }

  return { message: 'Username and email available' };
}

module.exports = checkAvailability;