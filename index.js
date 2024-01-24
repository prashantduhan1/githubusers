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



const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
