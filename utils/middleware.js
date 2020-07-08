const jwt = require("jsonwebtoken");

const requestLogger = (request, response, next) => {
  console.log("Method:", request.method);
  console.log("Path:  ", request.path);
  console.log("Body:  ", request.body);
  console.log("---");
  next();
};

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
};

const errorHandler = (error, request, response, next) => {
  console.error(error.message);

  if (error.name === "CastError" && error.kind === "ObjectId") {
    return response.status(400).send({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    return response
      .status(400)
      .json({ error: error.message, name: error.name });
  } else if (error.name === "JsonWebTokenError") {
    return response.status(401).json({
      error: "invalid token",
    });
  }
  next(error);
};
const tokenValidator = (request, response, next) => {
  if (request.path === "/api/users" && request.method === "POST") {
    next();
    return;
  }

  const authorization = request.get("authorization");

  if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
    token = authorization.substring(7);

    try {
      let tokenString = process.env.SECRET;

      const decodedToken = jwt.verify(token, tokenString);
      //console.log(decodedToken);
      if (!token || !decodedToken.id) {
        return response.status(401).json({ error: "token missing or invalid" });
      }

      if (request.path === "/api/admins") {
        if (decodedToken.userType !== "admin") {
          return response.status(401).json({ error: "Requires admin token" });
        }
      }

      response.locals.userType = decodedToken.userType;
      response.locals.name = decodedToken.name;
      response.locals.id = decodedToken.id;
      console.log(decodedToken);

      next();
    } catch (error) {
      next(error);
    }
  } else {
    return response.status(401).json({ error: "token missing" });
  }
};
module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenValidator,
};
