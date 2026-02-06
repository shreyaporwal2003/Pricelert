const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  let user = await User.findOne({ email });
  if (user) return res.status(400).json({ msg: "User exists" });

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);

  user = await User.create({ email, password: hashed });

  const payload = { user: { id: user.id } };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "5h" });

  res.json({ token });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

  const payload = { user: { id: user.id } };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "5h" });

  res.json({ token });
});

module.exports = router;
