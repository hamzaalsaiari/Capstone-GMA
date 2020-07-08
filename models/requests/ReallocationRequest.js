const mongoose = require("mongoose");

const reallocationRequestSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  amount: { type: Number, required: true, default: 0 },
  justification: { type: String, required: true },
  grantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Grant",
    required: true,
  },
  status: { type: String, required: true, default: "Pending" },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
});

const reallocationRequest = mongoose.model(
  "ReallocationRequest",
  reallocationRequestSchema
);

module.exports = reallocationRequest;
