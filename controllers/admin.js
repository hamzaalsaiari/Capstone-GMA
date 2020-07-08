const adminsRouter = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");

adminsRouter.get("/", (request, response) => {
  if (response.locals.userType == "admin") {
    User.find({ userType: "admin" }).then((users) => {
      response.json(users.map((user) => user.toJSON()));
    });
  }
});
adminsRouter.get("/:id", (request, response, next) => {
  if (response.locals.id !== request.params.id) {
    return response.status(401).json({ error: "You are not the user" });
  }
  User.findById(request.params.id)
    .then((foundUser) => {
      if (foundUser) {
        response.json(foundUser.toJSON());
      } else {
        response.status(404).json({ error: "User not found" });
      }
    })
    .catch((err) => next(err));
});

adminsRouter.post("/", async (request, response, next) => {
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
      .json({ error: "Admin with the email already exists" })
      .end();
  }

  try {
    const body = request.body;

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(body.password, saltRounds);

    const user = new User({
      email: body.email,
      name: body.name,
      passwordHash,
      userType: "admin",
    });

    const savedUser = await user.save();
    console.log(savedUser);
    response.json(savedUser);
  } catch (exception) {
    next(exception);
  }
});

adminsRouter.put("/:id", async (request, response, next) => {
  let foundAdmin = await User.findById(request.params.id);
  console.log(foundAdmin);

  if (foundAdmin.id.toString() !== response.locals.id) {
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
      foundAdmin.passwordHash
    );

    if (!passwordCompare) {
      return response
        .status(401)
        .json({ error: "Old password incorrect. Please try again" });
    }

    foundAdmin.passwordHash = await bcrypt.hash(request.body.newPassword, 10);
  }
  foundAdmin.name = request.body.name;
  foundAdmin.email = request.body.email;
  foundAdmin.gender = request.body.gender;
  foundAdmin.phoneNumber = request.body.phoneNumber;
  foundAdmin.role = request.body.role;
  foundAdmin.location = request.body.location;

  try {
    await foundAdmin.save();
    response.json(foundAdmin.toJSON());
  } catch (err) {
    next(err);
  }
});

module.exports = adminsRouter;
