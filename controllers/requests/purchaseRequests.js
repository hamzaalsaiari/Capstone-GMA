const purchaseRequestsRouter = require("express").Router();
const PurchaseRequest = require("../../models/requests/PurchaseRequest");
const Grant = require("../../models/Grant");

purchaseRequestsRouter.get("/", (request, response, next) => {
  PurchaseRequest.find({})
    .populate("grantId", { title: 1, _id: 1, pi: 1 })
    .populate("requester", { name: 1, email: 1, id: 1 })
    .populate("comments", {
      text: 1,
      date: 1,
      user: 1,
      edited: 1,
    })
    .then((purchaseRequests) => {
      if (response.locals.userType === "user") {
        purchaseRequests = purchaseRequests.filter(
          (req) => req.requester.id === response.locals.id
        );
      }
      response.json(purchaseRequests);
    });
});

purchaseRequestsRouter.get("/:id", (request, response, next) => {
  PurchaseRequest.findById(request.params.id)
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
        response.status(404).end();
      }
    })
    .catch((err) => next(err));
});

purchaseRequestsRouter.post("/", async (request, response, next) => {
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
      request.body.price * request.body.quantity > foundGrant.otherItemBudget ||
      request.body.price * request.body.quantity > foundGrant.availableBudget
    ) {
      return response
        .status(400)
        .json({ error: "Total Amount exceeds Budget for this grant" });
    } else {
      const newRequest = new PurchaseRequest({
        name: request.body.name,
        quantity: request.body.quantity,
        price: request.body.price,
        vendor: request.body.vendor,
        link: request.body.link,
        grantId: foundGrant._id,
        requester: response.locals.id,
      });

      const createdRequest = await newRequest.save();

      foundGrant.reservedBudget += request.body.price * request.body.quantity;
      foundGrant.otherItemBudget -= request.body.price * request.body.quantity;
      foundGrant.availableBudget -= request.body.price * request.body.quantity;

      foundGrant.purchaseRequests = foundGrant.purchaseRequests.concat(
        createdRequest._id
      );

      await foundGrant.save();
      return response.status(201).json(createdRequest.toJSON());
    }
  } catch (err) {
    next(err);
  }
});

purchaseRequestsRouter.put("/:id", (request, response, next) => {
  const newRequest = {
    name: request.body.name,
    quantity: request.body.quantity,
    price: request.body.price,
    vendor: request.body.vendor,
    link: request.body.link,
    status: request.body.status ? request.body.status : "Pending",
    grantId: foundGrant._id,
  };

  PurchaseRequest.findByIdAndUpdate(request.params.id, newRequest, {
    new: true,
  })
    .then((updatedRequest) => response.json(updatedRequest.toJSON()))
    .catch((error) => next(error));
});

purchaseRequestsRouter.put("/:id/status", async (request, response, next) => {
  /*
  request.body = {
    status:<"Approved" or "Denied" or "Pending">
  }
  */

  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires Admin token" });
  }

  try {
    const foundRequest = await PurchaseRequest.findById(request.params.id);
    if (!foundRequest) {
      response.status(404).json({ error: "Purchase Request not found" });
    } else if (
      request.body.status !== "Approved" &&
      request.body.status !== "Denied" &&
      request.body.status !== "Pending"
    ) {
      response.status(404).json({
        error: "Purchase Request must be either Approved, Denied or Pending",
      });
    } else {
      const foundGrant = await Grant.findById(foundRequest.grantId);
      const amount = foundRequest.price * foundRequest.quantity;
      if (foundRequest.status === "Pending") {
        if (request.body.status === "Approved") {
          foundGrant.reservedBudget -= amount;
          foundGrant.totalExpenses += amount;

          const newExpense = {
            amount,
            details: `Purchase: ${foundRequest.name}, Quantity: ${foundRequest.quantity}, Price: ${foundRequest.price}`,
            request: {
              type: "Purchase Request",
              id: foundRequest._id,
            },
          };

          foundGrant.expenses = foundGrant.expenses.concat(newExpense);
        } else if (request.body.status === "Denied") {
          foundGrant.reservedBudget -= amount;
          foundGrant.availableBudget += amount;
          foundGrant.otherItemBudget += amount;
        }
      } else if (
        foundRequest.status === "Approved" &&
        request.body.status === "Pending"
      ) {
        foundGrant.reservedBudget += amount;
        foundGrant.totalExpenses -= amount;
        foundGrant.expenses = foundGrant.expenses.filter(
          (expense) =>
            expense.request.id.toString() !== foundRequest._id.toString()
        );
      } else if (
        foundRequest.status === "Denied" &&
        request.body.status === "Pending"
      ) {
        foundGrant.reservedBudget += amount;
        foundGrant.availableBudget -= amount;
        foundGrant.otherItemBudget -= amount;
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

purchaseRequestsRouter.delete("/:id", async (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires Admin token" });
  }
  try {
    const foundRequest = await PurchaseRequest.findById(request.params.id);
    const foundGrant = await Grant.findById(foundRequest.grantId);

    if (!foundGrant) {
      return response.status(400).json({ error: "Grant not found" });
    } else if (!foundRequest) {
      return response.status(400).json({ error: "Purchase Request not found" });
    } else {
      if (foundRequest.status === "Pending") {
        const amount = foundRequest.price * foundRequest.quantity;
        foundGrant.reservedBudget -= amount;
        foundGrant.otherItemBudget += amount;
        foundGrant.availableBudget += amount;
      }
      foundGrant.purchaseRequests = foundGrant.purchaseRequests.filter(
        (r) => r.toString() !== foundRequest._id.toString()
      );

      await foundGrant.save();
      await foundRequest.delete();
      response.status(204).json({ message: "DELETED PURCHASE REQUEST" });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = purchaseRequestsRouter;
