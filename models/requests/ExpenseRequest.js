const mongoose = require("mongoose");

const expenseRequestSchema = new mongoose.Schema({
  details: { type: String, required: true, minlength: 1 },
  currency: { type: String, required: true, default: "$" },
  dateCreated: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true, default: 0 },
  expenseRequestType: { type: String, required: true, default: "Others" },
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

const expenseRequest = mongoose.model("ExpenseRequest", expenseRequestSchema);

module.exports = expenseRequest;
