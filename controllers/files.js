const filesRouter = require("express").Router();

filesRouter.get("/download/:filename", (request, response, next) => {
  const fileName = request.params.filename;
  try {
    response.download("./public/" + fileName, fileName);
  } catch (err) {
    next(err);
  }
});

module.exports = filesRouter;
