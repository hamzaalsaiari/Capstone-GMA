const config = require("../utils/config");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const loginRouter = require("express").Router();
const User = require("../models/User");

loginRouter.post("/", async (request, response) => {
  const body = request.body;

  if (!body.password || !body.email) {
    return response.status(400).json({
      error: "Missing Email or Password",
    });
  }

  const foundUser = await User.findOne({ email: body.email });

  const passwordCorrect =
    foundUser === null
      ? false
      : await bcrypt.compare(body.password, foundUser.passwordHash);

  if (!foundUser || !passwordCorrect) {
    return response.status(401).json({
      error: "Invalid Email or Password.",
    });
  }

  const token = jwt.sign(
    {
      email: foundUser.email,
      id: foundUser._id,
      name: foundUser.name,
      userType: foundUser.userType,
    },
    config.SECRET
  );

  response.status(200).send({
    token,
    email: foundUser.email,
    name: foundUser.name,
    userType: foundUser.userType,
    id: foundUser._id,
  });
});

module.exports = loginRouter;
