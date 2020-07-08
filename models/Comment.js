const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    minlength: 1,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  postType: {
    type: String,
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  date: { type: Date, required: true, default: Date.now },
  edited: { type: Boolean, default: false },
});

const Comment = mongoose.model("Comment", commentSchema);

commentSchema.plugin(uniqueValidator);
module.exports = Comment;
