const { User, Cafe, Session } = require('../models');
const bcrypt = require('bcrypt');
const checkAvailability = require('../middlewares/checkAvailability');

//for super-admin creating admin/new cafe owner
exports.createAdmin = async (req, res) => {
  const { username, password, email } = req.body;

  try {
    console.log(username, password, email)
    const availability = await checkAvailability(username, email);
    if(availability.status == 400) return res.status(400).json({ error: availability.message });

    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // Create the admin user
    const user = await User.create({ username, email, password: hashedPassword, roleId: 1 });

    // Return the created admin user
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

//for admin creating clerk
exports.createClerk = async (req, res) => {
  const { username, email, password, cafeId } = req.body;

  try {  
    const cafe = await Cafe.findOne({
      where: {
        cafeId: cafeId,
        ownerId: req.user.userId
      }
    });

    if (!cafe) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const availability = await checkAvailability(username, email);
    if(availability.status == 400) return res.status(400).json({ error: availability.message });

    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // Create the admin user
    const user = await User.create({ username, email, password: hashedPassword, roleId: 2, cafeId: cafeId });

    // Return the created admin user
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const generateRandom = () => {
  const randomString = Math.random().toString(36).substring(2, 8);
  return 'guest_' + randomString;
};

const createUniqueRandomUsername = async () => {
  let username;
  let isUsernameAvailable = false;

  // Keep generating random usernames until a unique one is found
  while (!isUsernameAvailable) {
    username = generateRandom();
    try {
      const existingUser = await User.findOne({ where: { username } });
      isUsernameAvailable = !existingUser;
    } catch (error) {
      console.error('Error checking username availability:', error);
      throw new Error('Internal server error');
    }
  }

  return username;
};

function generateToken() {
  // Generate a random string as session ID
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

exports.createGuest = async (req, res) => {
  try {
    const name = await createUniqueRandomUsername(); // Ensure await is used to get the generated name
    const generatedEmail = name + "@g.g"; // Adjust variable name to avoid conflict
    const username = name;
    const hashedPassword = await bcrypt.hash(generateRandom(), 10);

    // Create the user
    const user = await User.create({ email: generatedEmail, username, password: hashedPassword, roleId: 3 });

    // Create session ID
    const token = generateToken();

    // Create session record
    await Session.create({ userId: user.userId, token });

    // Return the created user
    res.status(201).json({token});
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.updateUser = async (req, res) => {
  const { email, username, password } = req.body;

  try {
    // Check if the username starts with "guest_"
    if (username.startsWith('guest_')) {
      return res.status(400).json({ error: 'Username cannot start with "guest_"' });
    }

    // Update the user's email and password
    req.user.email = email;
    req.user.username = username;
    req.user.password = password; // You may want to hash the password again if it's being updated
    await req.user.save();

    // Return the updated user
    res.status(200).json(req.user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAdminList = async (req, res) => {
  try {
    const adminUsers = await User.findAll({
      where: {
        roleId: 1 // Fetch users with roleId 1 (admin)
      }
    });
    res.status(200).json(adminUsers);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getClerkByCafeId = async (req, res) => {
  try {
    const { cafeId } = req.body;
    const { userId } = req.user;

    const cafe = await Cafe.findOne({
      where: {
        cafeId: cafeId,
        ownerId: userId
      }
    });

    if (!cafe) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Fetch all users associated with the cafeId
    const cafeClerks = await User.findAll({
      where: {
        cafeId: cafeId
      }
    });

    res.status(200).json(cafeClerks);
  } catch (error) {
    console.error('Error fetching cafe clerks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

