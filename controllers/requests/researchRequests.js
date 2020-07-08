const researchRequestsRouter = require("express").Router();
const ResearchAssistantRequest = require("../../models/requests/ResearchAssistantRequest");
const Grant = require("../../models/Grant");

researchRequestsRouter.get("/", (request, response, next) => {
  ResearchAssistantRequest.find({})
    .populate("grantId", { title: 1, _id: 1, pi: 1 })
    .populate("requester", { name: 1, email: 1, id: 1 })
    .populate("comments", {
      text: 1,
      date: 1,
      user: 1,
      edited: 1,
    })
    .then((raReqs) => {
      if (response.locals.userType === "user") {
        raReqs = raReqs.filter(
          (req) => req.requester.id.toString() === response.locals.id.toString()
        );
      }
      response.json(raReqs);
    })
    .catch((err) => next(err));
});

researchRequestsRouter.get("/:id", (request, response, next) => {
  ResearchAssistantRequest.findById(request.params.id)
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
          if (
            foundReq.requester.id.toString() !== response.locals.id.toString()
          ) {
            return response
              .status(401)
              .json({ error: "You are not the requester" });
          }
        }
        response.json(foundReq.toJSON());
      } else {
        response.status(400).json({ error: "RA Request not found" });
      }
    })
    .catch((err) => next(err));
});

researchRequestsRouter.post("/", async (request, response, next) => {
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
      request.body.salary > foundGrant.rABudget ||
      request.body.salary > foundGrant.availableBudget
    ) {
      return response
        .status(400)
        .json({ error: "Salary exceeds Budget for this grant" });
    } else {
      const newRequest = new ResearchAssistantRequest({
        name: request.body.name,
        salary: request.body.salary,
        startDate: request.body.startDate,
        endDate: request.body.endDate,
        grantId: foundGrant._id,
        requester: response.locals.id,
      });

      const createdRequest = await newRequest.save();

      foundGrant.reservedBudget += request.body.salary;
      foundGrant.rABudget -= request.body.salary;
      foundGrant.availableBudget -= request.body.salary;

      foundGrant.rARequests = foundGrant.rARequests.concat(createdRequest._id);

      await foundGrant.save();
      return response.status(201).json(createdRequest.toJSON());
    }
  } catch (err) {
    next(err);
  }
});

researchRequestsRouter.put("/:id", (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires Admin token" });
  }

  const newRequest = {
    name: request.body.name,
    salary: request.body.salary,
    startDate: request.body.startDate,
    endDate: request.body.endDate,
    status: request.body.status,
    grantId: request.body.grantId,
  };

  ResearchAssistantRequest.findByIdAndUpdate(request.params.id, newRequest, {
    new: true,
  })
    .then((updatedRequest) => response.json(updatedRequest.toJSON()))
    .catch((error) => next(error));
});

researchRequestsRouter.put("/:id/status", async (request, response, next) => {
  /*
  request.body = {
    status:<"Approved" or "Denied or "Pending"">
  }
  */
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires Admin token" });
  }

  try {
    const foundRequest = await ResearchAssistantRequest.findById(
      request.params.id
    );
    if (!foundRequest) {
      return response.status(404).json({ error: "RA Request not found" });
    } else if (
      request.body.status !== "Approved" &&
      request.body.status !== "Denied" &&
      request.body.status !== "Pending"
    ) {
      response.status(404).json({
        error: "RA Request must be either Approved, Denied or Pending",
      });
    } else {
      const foundGrant = await Grant.findById(foundRequest.grantId);
      if (foundRequest.status === "Pending") {
        if (request.body.status === "Approved") {
          foundGrant.reservedBudget -= foundRequest.salary;
          foundGrant.totalExpenses += foundRequest.salary;

          const newExpense = {
            amount: foundRequest.salary,
            details: `Research Assistant Hire: ${foundRequest.name}`,
            request: {
              type: "Research Assistant Request",
              id: foundRequest._id,
            },
          };

          foundGrant.expenses = foundGrant.expenses.concat(newExpense);
        } else if (request.body.status === "Denied") {
          foundGrant.reservedBudget -= foundRequest.salary;
          foundGrant.availableBudget += foundRequest.salary;
          foundGrant.rABudget += foundRequest.salary;
        }
      } else if (
        foundRequest.status === "Approved" &&
        request.body.status === "Pending"
      ) {
        foundGrant.reservedBudget += foundRequest.salary;
        foundGrant.totalExpenses -= foundRequest.salary;
        foundGrant.expenses = foundGrant.expenses.filter(
          (expense) =>
            expense.request.id.toString() !== foundRequest._id.toString()
        );
      } else if (
        foundRequest.status === "Denied" &&
        request.body.status === "Pending"
      ) {
        foundGrant.reservedBudget += foundRequest.salary;
        foundGrant.availableBudget -= foundRequest.salary;
        foundGrant.rABudget -= foundRequest.salary;
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

researchRequestsRouter.delete("/:id", async (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires Admin token" });
  }

  try {
    const foundRequest = await ResearchAssistantRequest.findById(
      request.params.id
    );
    const foundGrant = await Grant.findById(foundRequest.grantId);

    if (!foundGrant) {
      return response.status(400).json({ error: "Grant not found" });
    } else if (!foundRequest) {
      return response.status(400).json({ error: "Research Request not found" });
    } else {
      if (foundRequest.status === "Pending") {
        foundGrant.reservedBudget -= foundRequest.salary;
        foundGrant.rABudget += foundRequest.salary;
        foundGrant.availableBudget += foundRequest.salary;
      }
      foundGrant.rARequests = foundGrant.rARequests.filter(
        (r) => r.toString() !== foundRequest._id.toString()
      );

      await foundGrant.save();
      await foundRequest.delete();
      response.status(204).json({ message: "DELETED RA REQUEST" });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = researchRequestsRouter;
