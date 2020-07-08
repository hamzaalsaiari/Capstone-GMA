const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const expenseSchema = new mongoose.Schema({
  amount: Number,
  details: String,
  request: {
    requestType: String,
    id: { type: mongoose.Schema.Types.ObjectId },
  },
});

const grantSchema = new mongoose.Schema({
  costCenter: { type: String, required: true, unique: true },
  title: { type: String, required: true, unique: true, minlength: 3 },
  grantType: { type: String, required: true },
  college: { type: String, required: true },
  pi: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  coPi: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  status: { type: String, required: true, default: "Pending" },
  year: { type: String, required: true },
  //BUDGET and EXPENSE FIELDS
  //MAIN BUDGET FIELDS
  approvedBudget: { type: Number, default: 0 },
  availableBudget: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },
  reservedBudget: { type: Number, default: 0 },
  //BUDGET CATEGORIES
  rABudget: { type: Number, default: 0 },
  conferenceBudget: { type: Number, default: 0 },
  softwareAndHardwareBudget: { type: Number, default: 0 },
  otherItemBudget: { type: Number, default: 0 },
  //EXPENSES
  expenses: [expenseSchema],
  //REQUESTS
  purchaseRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseRequest",
    },
  ],
  expenseRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseRequest",
    },
  ],
  rARequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResearchAssistantRequest",
    },
  ],
  reallocationRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReallocationRequest",
    },
  ],
  committed: { type: Number, default: 0 },
  committedDetails: { type: String, default: null },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
  dateCreated: { type: Date, required: true, default: Date.now },
});

const Grant = mongoose.model("Grant", grantSchema);

grantSchema.plugin(uniqueValidator);
module.exports = Grant;
