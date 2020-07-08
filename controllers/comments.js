const commentsRouter = require("express").Router();
const Comment = require("../models/Comment");
const Grant = require("../models/Grant");
const ExpenseRequest = require("../models/requests/ExpenseRequest");
const PurchaseRequest = require("../models/requests/PurchaseRequest");
const ResearchAssistantRequest = require("../models/requests/ResearchAssistantRequest");
const ReallocationRequest = require("../models/requests/ReallocationRequest");

commentsRouter.get("/", (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires admin token" });
  }
  Comment.find({})
    .populate("user", { name: 1, id: 1 })
    .then((comments) => {
      response.json({ comments });
    });
});

commentsRouter.get("/:id", (request, response, next) => {
  Comment.findById(request.params.id)
    .populate("user", { name: 1, id: 1 })
    .then((foundComment) => {
      if (foundComment) {
        if (response.locals.userType !== "admin") {
          if (foundComment.user.name !== response.locals.name) {
            return response
              .status(401)
              .json({ error: "You are not the commenter" });
          }
        }
        return response.status(200).json(foundComment.toJSON());
      } else {
        response.status(400).json({ error: "Comment not found" });
      }
    })
    .catch((err) => next(err));
});

commentsRouter.post("/", async (request, response, next) => {
  try {
    const body = request.body;

    const comment = {
      text: body.text,
      user: response.locals.id,
      date: new Date(),
      postType: body.postType,
      postId: body.postId,
    };

    const newComment = await new Comment(comment).save();

    let post;
    switch (body.postType) {
      case "Grant":
        post = await Grant.findById(body.postId);
        break;
      case "RARequest":
        post = await ResearchAssistantRequest.findById(body.postId);
        break;
      case "ExpenseRequest":
        post = await ExpenseRequest.findById(body.postId);
        break;
      case "PurchaseRequest":
        post = await PurchaseRequest.findById(body.postId);
        break;
      case "ReallocationRequest":
        post = await ReallocationRequest.findById(body.postId);
        break;
      default:
        return response
          .status(400)
          .json({ error: "Please select a valid post type" });
    }
    if (post) {
      post.comments.push(newComment._id);
      await post.save();
    } else {
      return response.status(404).json({ error: `${body.postType} not found` });
    }
    Comment.findById(newComment._id)
      .populate("user", {
        name: 1,
        id: 1,
      })
      .then((popComment) => {
        return response.status(201).json(popComment);
      });
  } catch (err) {
    next(err);
  }
});

commentsRouter.put("/:id", async (request, response, next) => {
  const foundComment = await Comment.findById(
    request.params.id
  ).populate("user", { name: 1 });
  if (response.locals.userType !== "admin") {
    if (foundComment.user.id !== response.locals.id) {
      return response.status(401).json({ error: "You are not the commenter" });
    }
  } else if (!foundComment) {
    return response.status(404).json({ error: "Comment not found" });
  } else if (!request.body.text) {
    return response.status(400).json({ error: "Comment text missing" });
  }
  try {
    foundComment.text = request.body.text;
    foundComment.edited = true;
    const updatedComment = await foundComment.save();

    return response.json(updatedComment);
  } catch (err) {
    next(err);
  }
});

commentsRouter.delete("/:id", async (request, response, next) => {
  const foundComment = await Comment.findById(
    request.params.id
  ).populate("user", { name: 1 });
  if (response.locals.userType !== "admin") {
    if (foundComment.user.id !== response.locals.id) {
      return response.status(401).json({ error: "You are not the commenter" });
    }
  } else if (!foundComment) {
    return response.status(404).json({ error: "Comment not found" });
  }
  try {
    let post;
    switch (foundComment.postType) {
      case "Grant":
        post = await Grant.findById(foundComment.postId);
        break;
      case "RARequest":
        post = await ResearchAssistantRequest.findById(foundComment.postId);
        break;
      case "ExpenseRequest":
        post = await ExpenseRequest.findById(foundComment.postId);
        break;
      case "PurchaseRequest":
        post = await PurchaseRequest.findById(foundComment.postId);
        break;
      case "ReallocationRequest":
        post = await ReallocationRequest.findById(foundComment.postId);
        break;
      default:
        return response
          .status(400)
          .json({ error: "Please select a valid post type" });
    }
    if (post) {
      post.comments = post.comments.filter(
        (commentId) => commentId.toString() !== foundComment._id.toString()
      );
      await post.save();
    } else {
      return response.status(404).json({ error: `${body.postType} not found` });
    }

    await foundComment.delete();
    response.status(204).json({ message: "DELETED COMMENT" });
  } catch (err) {
    next(err);
  }
});

module.exports = commentsRouter;
