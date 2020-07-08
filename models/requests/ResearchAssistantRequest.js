const mongoose = require("mongoose");
const Grant = require("../Grant");
const researchAssistantRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 4 },
  salary: { type: Number, required: true, default: "0" },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, required: true, default: Date.now },
  status: { type: String, required: true, default: "Pending" },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  grantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Grant",
    required: true,
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
});

const researchAssistantRequest = mongoose.model(
  "ResearchAssistantRequest",
  researchAssistantRequestSchema
);

module.exports = researchAssistantRequest;
