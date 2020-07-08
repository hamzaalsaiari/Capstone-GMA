const expenseRequestsRouter = require("express").Router();
const ExpenseRequest = require("../../models/requests/ExpenseRequest");
const Grant = require("../../models/Grant");
const path = require("path");
const fs = require("fs");
const reqTypes = {
  "Conference Travel": "conferenceBudget",
  "Publication Fees": "otherItemBudget",
  "Items Purchase": "otherItemBudget",
  "Software/Hardware Purchase": "softwareAndHardwareBudget",
  Others: "otherItemBudget",
};

expenseRequestsRouter.get("/", (request, response, next) => {
  ExpenseRequest.find({})
    .populate("grantId", { title: 1, _id: 1, pi: 1 })
    .populate("requester", { name: 1, email: 1, id: 1 })
    .populate("comments", {
      text: 1,
      date: 1,
      user: 1,
      edited: 1,
    })
    .then((exReqs) => {
      if (response.locals.userType === "user") {
        exReqs = exReqs.filter(
          (req) => req.requester.id.toString() === response.locals.id.toString()
        );
      }
      response.json(exReqs);
    })
    .catch((err) => next(err));
});

expenseRequestsRouter.get("/:id", (request, response, next) => {
  ExpenseRequest.findById(request.params.id)
    .populate("grantId", { title: 1, _id: 1, pi: 1 })
    .populate("requester", { name: 1, email: 1 })
    .populate({
      path: "comments",
      model: "Comment",
      populate: {
        path: "user",
        model: "User",
      },
    })
    .then((foundReq) => {
      if (foundReq) {
        if (response.locals.userType === "user") {
          if (foundReq.requester.id !== response.locals.id) {
            return response
              .status(401)
              .json({ error: "You are not the requester" });
          }
        }
        response.json(foundReq.toJSON());
      } else {
        response.status(404).json({ error: "Expense Request not found" });
      }
    })
    .catch((err) => next(err));
});

expenseRequestsRouter.post("/", async (request, response, next) => {
  try {
    const foundGrant = await Grant.findById(request.body.grantId);
    if (
      foundGrant.pi.toString() !== response.locals.id.toString() &&
      response.locals.userType !== "admin"
    ) {
      return response
        .status(401)
        .json({ error: "You are not the PI for this grant" });
    }
    if (
      request.body.expenseRequestType &&
      !reqTypes.hasOwnProperty(request.body.expenseRequestType)
    ) {
      return response
        .status(400)
        .json({ error: "Please enter valid expense request type" });
    } else if (
      request.body.amount > foundGrant.availableBudget ||
      request.body.amount >
        foundGrant[reqTypes[request.body.expenseRequestType]]
    ) {
      return response
        .status(400)
        .json({ error: "Total Amount exceeds Budget for this grant" });
    } else {
      const newRequest = new ExpenseRequest({
        details: request.body.details,
        currency: request.body.currency,
        dateCreated: request.body.dateCreated,
        amount: request.body.amount,
        expenseRequestType: request.body.expenseRequestType,
        grantId: foundGrant._id,
        requester: response.locals.id,
      });

      const createdRequest = await newRequest.save();

      foundGrant.reservedBudget += request.body.amount;
      foundGrant[reqTypes[request.body.expenseRequestType]] -=
        request.body.amount;
      foundGrant.availableBudget -= request.body.amount;

      foundGrant.expenseRequests = foundGrant.expenseRequests.concat(
        createdRequest._id
      );

      await foundGrant.save();
      return response.status(201).json(createdRequest.toJSON());
    }
  } catch (err) {
    next(err);
  }
});

expenseRequestsRouter.put("/:id", (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires Admin token" });
  }

  const newRequest = {
    details: request.body.details,
    currency: request.body.currency,
    dateCreated: request.body.dateCreated,
    amount: request.body.amount,
    expenseRequestType: request.body.expenseRequestType,
    status: request.body.status ? request.body.status : "Pending",
    grantId: request.body.grantId,
  };

  ExpenseRequest.findByIdAndUpdate(request.params.id, newRequest, {
    new: true,
  })
    .then((updatedRequest) => response.json(updatedRequest.toJSON()))
    .catch((error) => next(error));
});

expenseRequestsRouter.put("/:id/status", async (request, response, next) => {
  /*
  request.body = {
    status:<"Approved" or "Denied" or "Pending">
  }
  */

  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires Admin token" });
  }

  try {
    const foundRequest = await ExpenseRequest.findById(request.params.id);
    if (!foundRequest) {
      response.status(404).json({ error: "Expense Request not found" });
    } else if (
      request.body.status !== "Approved" &&
      request.body.status !== "Denied" &&
      request.body.status !== "Pending"
    ) {
      response.status(404).json({
        error: "Expense Request must be either Approved, Denied or Pending",
      });
    } else {
      const foundGrant = await Grant.findById(foundRequest.grantId);
      if (foundRequest.status === "Pending") {
        if (request.body.status === "Approved") {
          foundGrant.reservedBudget -= foundRequest.amount;
          foundGrant.totalExpenses += foundRequest.amount;
          const newExpense = {
            amount: foundRequest.amount,
            details: `Expense: ${foundRequest.details}, Type:${foundRequest.expenseRequestType}`,
            request: {
              requestType: "Expense Request",
              id: foundRequest._id,
            },
          };
          foundGrant.expenses = foundGrant.expenses.concat(newExpense);
        } else if (request.body.status === "Denied") {
          foundGrant.reservedBudget -= foundRequest.amount;
          foundGrant.availableBudget += foundRequest.amount;
          foundGrant[reqTypes[foundRequest.expenseRequestType]] +=
            foundRequest.amount;
        }
      } else if (
        foundRequest.status === "Approved" &&
        request.body.status === "Pending"
      ) {
        foundGrant.reservedBudget += foundRequest.amount;
        foundGrant.totalExpenses -= foundRequest.amount;
        foundGrant.expenses = foundGrant.expenses.filter(
          (expense) =>
            expense.request.id.toString() !== foundRequest._id.toString()
        );
      } else if (
        foundRequest.status === "Denied" &&
        request.body.status === "Pending"
      ) {
        foundGrant.reservedBudget += foundRequest.amount;
        foundGrant.availableBudget -= foundRequest.amount;
        foundGrant[reqTypes[foundRequest.expenseRequestType]] -=
          foundRequest.amount;
      } else {
        return response
          .status(400)
          .json({ error: "Invalid request status change" });
      }

      await foundGrant.save();
      foundRequest.status = request.body.status;
      const updatedRequest = await foundRequest.save();
      response.json(updatedRequest.populate("grantId").toJSON());
    }
  } catch (err) {
    next(err);
  }
});

expenseRequestsRouter.delete("/:id", async (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires Admin token" });
  }

  try {
    const foundRequest = await ExpenseRequest.findById(request.params.id);

    const foundGrant = await Grant.findById(foundRequest.grantId);
    if (!foundGrant) {
      return response.status(400).json({ error: "Grant not found" });
    } else if (!foundRequest) {
      return response.status(400).json({ error: "Expense Request not found" });
    } else {
      if (foundRequest.status === "Pending") {
        foundGrant.reservedBudget -= foundRequest.amount;
        foundGrant[reqTypes[foundRequest.expenseRequestType]] +=
          foundRequest.amount;
        foundGrant.availableBudget += foundGrant.amount;
      }
      foundGrant.expenseRequests = foundGrant.expenseRequests.filter(
        (r) => r.toString() !== foundRequest._id.toString()
      );
      await foundGrant.save();
      await foundRequest.delete();
      response.status(204).json({ message: "DELETED EXPENSE REQUEST" });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = expenseRequestsRouter;
