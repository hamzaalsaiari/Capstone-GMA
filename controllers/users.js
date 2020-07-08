const usersRouter = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const { request, response } = require("express");

usersRouter.get("/", (request, response) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires Admin Token" });
  }
  User.find({ userType: "user" }).then((users) => {
    response.json(users.map((user) => user.toJSON()));
  });
});

usersRouter.get("/:id", (request, response, next) => {
  User.findById(request.params.id)
    .then((foundUser) => {
      if (foundUser) {
        if (
          response.locals.userType !== "admin" &&
          foundUser.name !== response.locals.name
        ) {
          return response.status(401).json({ error: "You are not the user" });
        }
        response.json(foundUser.toJSON());
      } else {
        response.status(404).json({ error: "User not found" });
      }
    })
    .catch((err) => next(err));
});

usersRouter.get("/findbyname/:name", (request, response, next) => {
  const name = request.params.name;

  const queryString = name.split("_").join(" ");

  User.find({
    name: new RegExp(queryString, "i"),
  })
    .then((foundUsers) => {
      response.json(foundUsers.slice(0, 6).map((user) => user.toJSON()));
    })
    .catch((err) => next(err));
});

usersRouter.post("/", async (request, response, next) => {
  if (!request.body.password || !request.body.email || !request.body.name) {
    return response.status(400).json({ error: "Missing Fields" }).end();
  }

  if (request.body.password.toString().length < 5) {
    return response
      .status(400)
      .json({ error: "Password must be at least 5 characters long" })
      .end();
  }

  const checkUser = await User.findOne({ email: request.body.email });
  if (checkUser) {
    return response
      .status(400)
      .json({ error: "User with the email already exists" })
      .end();
  }

  try {
    const body = request.body;

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(body.password, saltRounds);

    const user = new User({
      email: body.email,
      name: body.name,
      userType: "user",
      passwordHash,
    });

    const savedUser = await user.save();
    console.log(savedUser);
    response.json(savedUser);
  } catch (exception) {
    next(exception);
  }
});

usersRouter.put("/:id", async (request, response, next) => {
  let foundUser = await User.findById(request.params.id);
  console.log(foundUser);

  if (
    foundUser.id.toString() !== response.locals.id &&
    response.locals.userType !== "admin"
  ) {
    return response.status(401).json({ error: "You are not the user" });
  }

  if (
    request.body.oldPassword ||
    request.body.newPassword ||
    request.body.confirmNewPassword
  ) {
    if (!request.body.oldPassword) {
      return response.status(400).json({ error: "Old password missing" });
    } else if (!request.body.newPassword || !request.body.confirmNewPassword) {
      return response.status(400).json({ error: "New password missing" });
    } else if (request.body.newPassword !== request.body.confirmNewPassword) {
      return response
        .status(400)
        .json({ error: "New password does not match confirm password" });
    } else if (request.body.newPassword.length < 6) {
      return response
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    const passwordCompare = await bcrypt.compare(
      request.body.oldPassword,
      foundUser.passwordHash
    );

    if (!passwordCompare) {
      return response
        .status(401)
        .json({ error: "Old password incorrect. Please try again" });
    }

    foundUser.passwordHash = await bcrypt.hash(request.body.newPassword, 10);
  }
  foundUser.name = request.body.name;
  foundUser.email = request.body.email;
  foundUser.gender = request.body.gender;
  foundUser.phoneNumber = request.body.phoneNumber;
  foundUser.role = request.body.role;
  foundUser.location = request.body.location;

  try {
    await foundUser.save();
    response.json(foundUser.toJSON());
  } catch (err) {
    next(err);
  }
});

module.exports = usersRouter;
