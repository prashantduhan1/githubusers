const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(express.json());

mongoose.connect('mongodb+srv://prashantduhan01:Primary%40$007@cluster0.p30b1ru.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  location: { type: String },
  blog: { type: String },
  bio: { type: String },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deleted: { type: Boolean, default: false },
});

const User = mongoose.model('User', userSchema);

// 1. Save GitHub user details into the database
app.post('/save_user/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(200).json({ message: 'User already exists in the database' });
    }

    const githubApiUrl = `https://api.github.com/users/${username}`;
    const response = await axios.get(githubApiUrl);

    if (response.status === 200) {
      const userData = response.data;

      const newUser = new User({
        username: userData.login,
        location: userData.location,
        blog: userData.blog,
        bio: userData.bio,
      });

      await newUser.save();

      return res.status(200).json({ message: 'User data saved successfully' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 2. Find mutually followed users and save them as friends
app.post('/find_friends/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username }).populate('friends');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const githubApiUrl = `https://api.github.com/users/${username}/following`;
    const response = await axios.get(githubApiUrl);

    if (response.status === 200) {
      const following = response.data.map(followedUser => followedUser.login);

      const mutualFriends = await User.find({
        username: { $in: following },
        friends: user._id,
      });

      user.friends = mutualFriends.map(friend => friend._id);
      await user.save();

      return res.status(200).json({ message: 'Mutual friends saved successfully' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 3. Search saved data from the database
app.get('/search_users', async (req, res) => {
  try {
    const { username, location } = req.query;
    const query = {};

    if (username) {
      query.username = new RegExp(username, 'i');
    }

    if (location) {
      query.location = new RegExp(location, 'i');
    }

    const users = await User.find(query);
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 4. Delete a record based on a given username
app.delete('/delete_user/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOneAndDelete({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 5. Update fields for a given user in the database
app.put('/update_user/:username', async (req, res) => {
  const { username } = req.params;
  const { location, blog, bio } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (location) user.location = location;
    if (blog) user.blog = blog;
    if (bio) user.bio = bio;

    await user.save();

    return res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 6. Return list of all users from the database sorted by given fields
app.get('/get_all_users', async (req, res) => {
  const { sortField } = req.query;

  try {
    const users = await User.find({ deleted: { $ne: true } }).sort(sortField || 'username');
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
