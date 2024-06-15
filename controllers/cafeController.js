const { User, Cafe } = require('../models');

//for admin creating cafe
exports.createCafe = async (req, res) => {
  const { name } = req.body;

  try {
    const cafe = await Cafe.create({ name, ownerId: req.user.userId });

    res.status(201).json(cafe);
  } catch (error) {
    console.error('Error creating clerk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

//for admin/owner updating cafe
exports.updateCafe = async (req, res) => {
  const { cafeId, name } = req.body;

  try {
    // Find the cafe by its ID
    const cafe = await Cafe.findByPk(cafeId);

    if (!cafe) {
      return res.status(404).json({ error: 'Cafe not found' });
    }

    // Check if the user is the owner of the cafe
    if (cafe.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to update this cafe' });
    }

    // Update the cafe's name
    cafe.name = name;
    await cafe.save();

    res.status(200).json(cafe);
  } catch (error) {
    console.error('Error updating cafe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


//its for clerk setting socket
// exports.setCafeSocket = async (req, res) => {
//   const { socketId } = req.body;

//   try {
//     // Find the cafeId from clerk table, cause clerk can have only 1 cafeId
//     const cafe = await Cafe.findByPk(req.user.cafeId);

//     if (!cafe) {
//       return res.status(404).json({ error: 'Cafe not found' });
//     }

//     // Update the cafe's socket
//     cafe.socketId = socketId;
//     await cafe.save();

//     res.status(200).json(cafe);
//   } catch (error) {
//     console.error('Error updating cafe:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

//for super admin
exports.getCafeByUserId = async (req, res) => {
  try {
    const { userId } = req.data;
    const cafe = await Cafe.findAll({
      where: {
        ownerId: userId
      }
    });
    
    res.status(200).json(cafe);
  } catch (error) {
    console.error('Error updating cafe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
exports.getMyCafe = async (req, res) => {
  try {
    const cafe = await Cafe.findAll({
      where: {
        ownerId: req.user.userId
      }
    });
    
    res.status(200).json(cafe);
  } catch (error) {
    console.error('Error updating cafe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};