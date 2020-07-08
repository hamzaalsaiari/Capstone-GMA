const reallocationRequestsRouter = require("express").Router();
const ReallocationRequest = require("../../models/requests/ReallocationRequest");
const Grant = require("../../models/Grant");

const reqStrings = {
  "Conference Budget": "conferenceBudget",
  "RA Budget": "rABudget",
  "Software/Hardware Budget": "softwareAndHardwareBudget",
  "Other Item Budget": "otherItemBudget",
};

reallocationRequestsRouter.get("/", (request, response, next) => {
  ReallocationRequest.find({})
    .populate("grantId", { title: 1, _id: 1, pi: 1 })
    .populate("requester", { name: 1, email: 1, id: 1 })
    .populate("comments", {
      text: 1,
      date: 1,
      user: 1,
      edited: 1,
    })
    .then((reallocationRequests) => {
      if (response.locals.userType === "user") {
        reallocationRequests = reallocationRequests.filter(
          (req) => req.requester.id === response.locals.id
        );
      }
      response.json(reallocationRequests);
    });
});

reallocationRequestsRouter.get("/:id", (request, response, next) => {
  ReallocationRequest.findById(request.params.id)
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

reallocationRequestsRouter.post("/", async (request, response, next) => {
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
      !reqStrings.hasOwnProperty(request.body.from) ||
      !reqStrings.hasOwnProperty(request.body.to)
    ) {
      return response.status(400).json({ error: "Invalid budget categories" });
    } else if (
      foundGrant[reqStrings[request.body.from]] < request.body.amount
    ) {
      return response.status(400).json({
        error: `Amount exceeds ${request.body.from}`,
      });
    } else {
      const newRequest = new ReallocationRequest({
        from: request.body.from,
        to: request.body.to,
        amount: request.body.amount,
        justification: request.body.justification,
        grantId: foundGrant._id,
        requester: response.locals.id,
      });

      const createdRequest = await newRequest.save();

      foundGrant.reallocationRequests = foundGrant.reallocationRequests.concat(
        createdRequest._id
      );

      await foundGrant.save();
      return response.status(201).json(createdRequest.toJSON());
    }
  } catch (err) {
    next(err);
  }
});

reallocationRequestsRouter.put(
  "/:id/status",
  async (request, response, next) => {
    /*
    request.body = {
      status:<"Approved" or "Denied" or "Pending">
    }
    */
    if (response.locals.userType !== "admin") {
      return response.status(401).json({ error: "Requires Admin token" });
    }

    try {
      const foundRequest = await ReallocationRequest.findById(
        request.params.id
      );
      if (!foundRequest) {
        response.status(404).json({ error: "Reallocation Request not found" });
      } else if (
        request.body.status !== "Approved" &&
        request.body.status !== "Denied" &&
        request.body.status !== "Pending"
      ) {
        response.status(404).json({
          error:
            "Reallocation Request must be either Approved, Denied or Pending",
        });
      } else {
        const foundGrant = await Grant.findById(foundRequest.grantId);
        if (
          (foundRequest.status === "Pending" &&
            request.body.status === "Approved") ||
          (foundRequest.status === "Denied" &&
            request.body.status === "Approved")
        ) {
          foundGrant[reqStrings[foundRequest.from]] -= foundRequest.amount;
          foundGrant[reqStrings[foundRequest.to]] += foundRequest.amount;
        } else if (
          (foundRequest.status === "Approved" &&
            request.body.status === "Denied") ||
          (foundRequest.status === "Approved" &&
            request.body.status === "Pending")
        ) {
          foundGrant[reqStrings[foundRequest.from]] += foundRequest.amount;
          foundGrant[reqStrings[foundRequest.to]] -= foundRequest.amount;
        }
        await foundGrant.save();
        foundRequest.status = request.body.status;
        const updatedRequest = await foundRequest.save();
        response.json(updatedRequest.populate("grantId").toJSON());
      }
    } catch (err) {
      next(err);
    }
  }
);

reallocationRequestsRouter.put("/:id", (request, response, next) => {
  const newRequest = {
    from: request.body.from,
    to: request.body.to,
    amount: request.body.amount,
    justification: request.body.justification,
    status: request.body.status ? request.body.status : "Pending",
    grantId: request.body.grantId,
  };

  ReallocationRequest.findByIdAndUpdate(request.params.id, newRequest, {
    new: true,
  })
    .then((updatedRequest) => response.json(updatedRequest.toJSON()))
    .catch((error) => next(error));
});

reallocationRequestsRouter.delete("/:id", async (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires Admin token" });
  }

  try {
    const foundRequest = await ReallocationRequest.findById(request.params.id);
    const foundGrant = await Grant.findById(foundRequest.grantId);

    if (!foundGrant) {
      return response.status(400).json({ error: "Grant not found" });
    } else if (!foundRequest) {
      return response
        .status(400)
        .json({ error: "Reallocation Request not found" });
    } else {
      foundGrant.reallocationRequests = foundGrant.reallocationRequests.filter(
        (r) => r.toString() !== foundRequest._id.toString()
      );
      await foundRequest.delete();
      await foundGrant.save();
      response.status(204).json({ message: "DELETED REALLOCATION REQUEST" });
    }
  } catch (err) {
    next(err);
  }
});
module.exports = reallocationRequestsRouter;
