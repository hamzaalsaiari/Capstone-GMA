const mongoose = require("mongoose");

const purchaseRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 2 },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true, default: 0 },
  vendor: { type: String, required: true },
  link: { type: String },
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

const purchaseRequest = mongoose.model(
  "PurchaseRequest",
  purchaseRequestSchema
);

module.exports = purchaseRequest;
