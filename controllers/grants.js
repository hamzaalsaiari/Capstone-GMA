const grantsRouter = require("express").Router();
const Grant = require("../models/Grant");
const User = require("../models/User");
const mongoose = require("mongoose");
const mongooseUniqueValidator = require("mongoose-unique-validator");
const { response, request, query } = require("express");

const checkBudgetAllocation = (
  approvedBudget,
  availableBudget,
  reservedBudget,
  totalExpenses,
  rABudget,
  conferenceBudget,
  softwareAndHardwareBudget,
  otherItemBudget
) => {
  const budgetCategoryTotal =
    rABudget + conferenceBudget + softwareAndHardwareBudget + otherItemBudget;
  let errorObj = { error: "" };
  if (budgetCategoryTotal !== availableBudget) {
    errorObj.error =
      "Sum of budget categories must be less than Available Budget";
  } else if (
    availableBudget + reservedBudget + totalExpenses >
    approvedBudget
  ) {
    errorObj.error =
      "Sum of available budget, reserved budget and total expenses must equal approved budget";
  }

  return errorObj;
};

grantsRouter.get("/counter/monthlyspending", async (req, res, next) => {
  const spendingObject = {
    Jan: 0,
    Feb: 0,
    Mar: 0,
    Apr: 0,
    May: 0,
    Jun: 0,
    Jul: 0,
    Aug: 0,
    Sep: 0,
    Oct: 0,
    Nov: 0,
    Dec: 0,
  };
  const currentYear = new Date().toDateString().split(" ")[3];
  const grants = await Grant.find({});
  grants.forEach((grant) => {
    const year = new Date(grant.dateCreated).toDateString().split(" ")[3];
    const month = new Date(grant.dateCreated).toDateString().split(" ")[1];
    if (year === currentYear) {
      spendingObject[month] += grant.totalExpenses;
    }
  });
  res.json(spendingObject);
});

grantsRouter.get("/counter/yearlyspending", async (req, res, next) => {
  const countObject = {
    "2016/2017": 0,
    "2017/2018": 0,
    "2018/2019": 0,
    "2019/2020": 0,
    "2020/2021": 0,
  };

  const grants = await Grant.find();

  grants.forEach((grant) => {
    countObject[grant.year] += grant.approvedBudget;
  });
  res.json(countObject);
});

grantsRouter.get("/counter/college", async (req, res, next) => {
  const colleges = ["COB", "COE", "COL", "CAS", "CHS", "MP", "UC"];
  let countObject = {};
  const findCollegeCount = async (collegeQuery) => {
    try {
      const collegeCount = await Grant.countDocuments(collegeQuery);
      countObject[collegeQuery.college] = collegeCount;
    } catch (err) {
      next(err);
    }
  };
  const promises = colleges.map((collegeName) =>
    findCollegeCount({ college: collegeName })
  );
  await Promise.all(promises);
  res.json(countObject);
});

grantsRouter.get("/counter/college/spending", async (req, res, next) => {
  let countObject = { COB: 0, COE: 0, COL: 0, CAS: 0, CHS: 0, MP: 0, UC: 0 };

  const grants = await Grant.find();

  grants.forEach((grant) => {
    countObject[grant.college] += grant.approvedBudget;
  });

  res.json(countObject);
});

grantsRouter.get("/counter/status", async (req, res, next) => {
  const statuses = ["Active", "Expired", "Pending"];
  let countObject = {};
  const findStatusCount = async (statusQuery) => {
    try {
      const collegeCount = await Grant.countDocuments(statusQuery);
      countObject[statusQuery.status] = collegeCount;
    } catch (err) {
      next(err);
    }
  };
  const promises = statuses.map((statusType) =>
    findStatusCount({ status: statusType })
  );
  await Promise.all(promises);
  res.json(countObject);
});

grantsRouter.get("/counter/type", async (req, res, next) => {
  const grantTypes = [
    "Faculty Research Incentive Grant",
    "Teaching & Learning Grant",
    "Action Research Grant",
    "Other",
  ];
  let countObject = {};
  const findGrantTypeCount = async (grantTypeQuery) => {
    try {
      const grantTypeCount = await Grant.countDocuments(grantTypeQuery);
      countObject[grantTypeQuery.grantType] = grantTypeCount;
    } catch (err) {
      next(err);
    }
  };
  const promises = grantTypes.map((gtype) =>
    findGrantTypeCount({ grantType: gtype })
  );
  await Promise.all(promises);
  res.json(countObject);
});

grantsRouter.get("/counter/type/spending", async (req, res, next) => {
  let countObject = {
    "Faculty Research Incentive Grant": 0,
    "Teaching & Learning Grant": 0,
    "Action Research Grant": 0,
    Other: 0,
  };
  const grants = await Grant.find();
  grants.forEach((grant) => {
    countObject[grant.grantType] += grant.approvedBudget;
  });
  res.json(countObject);
});

grantsRouter.get("/", (request, response, next) => {
  let queryObject;
  if (response.locals.userType === "admin") {
    queryObject = {};
  } else {
    queryObject = {
      $or: [{ pi: response.locals.id }, { coPi: response.locals.id }],
    };
  }
  console.log("queryObject", queryObject);
  Grant.find(queryObject)
    .populate("pi", {
      name: 1,
      email: 1,
    })
    .populate("coPi", {
      name: 1,
      email: 1,
    })
    .populate("expenseRequests", {
      details: 1,
      status: 1,
      expenseRequestType: 1,
      amount: 1,
    })
    .populate("purchaseRequests")
    .populate("rARequests", {
      name: 1,
      salary: 1,
      status: 1,
      requester: 1,
    })
    .populate("reallocationRequests")
    .populate({
      path: "comments",
      model: "Comment",
      populate: {
        path: "user",
        model: "User",
      },
    })

    .then((grants) => {
      response.json({ grants });
    });
});

grantsRouter.get("/:id", (request, response, next) => {
  Grant.findById(request.params.id)
    .populate("pi", {
      name: 1,
      email: 1,
    })
    .populate("coPi", {
      name: 1,
      email: 1,
    })
    .populate("expenseRequests", {
      details: 1,
      status: 1,
      expenseRequestType: 1,
      amount: 1,
      requester: 1,
    })
    .populate("purchaseRequests")
    .populate("rARequests", {
      name: 1,
      salary: 1,
      status: 1,
      requester: 1,
    })
    .populate("reallocationRequests")
    .populate({
      path: "comments",
      model: "Comment",
      populate: {
        path: "user",
        model: "User",
      },
    })
    .then((grant) => {
      if (grant) {
        if (response.locals.userType !== "admin") {
          if (grant.pi.id.toString() !== response.locals.id) {
            if (!grant.coPi) {
              return response.status(401).json({ error: "Unauthorized user" });
            } else if (grant.coPi.id.toString() !== response.locals.id) {
              return response.status(401).json({ error: "Unauthorized user" });
            }
          }
        }
        return response.json(grant.toJSON());
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => next(error));
});

grantsRouter.post("/", (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires admin token" });
  }
  const body = request.body;
  if (body.pi) {
    User.findById(body.pi).then((foundUser) => {
      if (!foundUser) {
        return response.status(404).json({ error: "PI not found" });
      }
    });
  } else {
    return response.status(400).json({ error: "PI field is missing" });
  }
  if (body.coPi) {
    User.findById(body.coPi).then((foundUser) => {
      if (!foundUser) {
        return response.status(404).json({ error: "Co PI not found" });
      }
    });
  }

  const errorObj = checkBudgetAllocation(
    body.approvedBudget,
    body.availableBudget,
    body.reservedBudget,
    body.totalExpenses,
    body.rABudget,
    body.conferenceBudget,
    body.softwareAndHardwareBudget,
    body.otherItemBudget
  );

  if (errorObj.error) {
    return response.status(400).json(errorObj);
  }

  const newGrant = new Grant({
    costCenter: body.costCenter,
    title: body.title,
    grantType: body.grantType,
    college: body.college,
    pi: body.pi,
    coPi: body.coPi || null,
    status: body.status,
    year: body.year,
    //BUDGET and EXPENSE FIELDS
    //MAIN BUDGET FIELDS
    approvedBudget: body.approvedBudget,
    availableBudget: body.availableBudget,
    totalExpenses: body.totalExpenses,
    reservedBudget: body.reservedBudget,
    //BUDGET CATEGORIES
    rABudget: body.rABudget,
    conferenceBudget: body.conferenceBudget,
    softwareAndHardwareBudget: body.softwareAndHardwareBudget,
    otherItemBudget: body.otherItemBudget,
    //EXPENSES
    expenses: body.expenses,
    //REQUESTS
    purchaseRequests: body.purchaseRequests,
    expenseRequests: body.expenseRequests,
    rARequests: body.rARequests,
    committed: body.committed,
    committedDetails: body.committedDetails,
  });

  newGrant
    .save()
    .then((createdGrant) => response.status(201).json(createdGrant.toJSON()))
    .catch((error) => {
      next(error);
    });
});

grantsRouter.delete("/deletemany", (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires admin token" });
  }
  const idArray = request.body.ids.map((id) => mongoose.Types.ObjectId(id));
  Grant.deleteMany({
    _id: {
      $in: idArray,
    },
  })
    .then(() => {
      response.status(204).json({ message: "DELETED" });
    })
    .catch((err) => next(err));
});

grantsRouter.delete("/:id", (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires admin token" });
  }

  Grant.findByIdAndRemove(request.params.id)
    .then(() => {
      response.status(204).json({ message: "DELETED" });
    })
    .catch((error) => next(error));
});

grantsRouter.delete("/deletemany", (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires admin token" });
  }
  const idArray = request.body.ids.map((id) => mongoose.Types.ObjectId(id));
  Grant.deleteMany({
    _id: {
      $in: idArray,
    },
  })
    .then(() => {
      response.status(204).json({ message: "DELETED" });
    })
    .catch((err) => next(err));
});

grantsRouter.put("/:id", async (request, response, next) => {
  if (response.locals.userType !== "admin") {
    return response.status(401).json({ error: "Requires admin token" });
  }

  let foundGrant, foundPi, foundCoPi;

  try {
    foundGrant = await Grant.findById(request.params.id);
  } catch (err) {
    next(err);
  }

  if (!foundGrant) {
    return response.status(404).json({ error: "Grant not found" });
  }

  const body = request.body;

  if (!body.pi) {
    return response.status(400).json({ error: "PI field is missing" });
  }

  try {
    foundPi = await User.findById(body.pi);
  } catch (err) {
    next(err);
  }

  if (!foundPi) {
    return response.status(400).json({ error: "Grant PI not found" });
  }

  if (body.coPi) {
    if (body.coPi !== foundGrant.coPi) {
      try {
        foundCoPi = await User.findById(body.coPi);
      } catch (err) {
        next(err);
      }

      if (!foundCoPi) {
        return response.status(404).json({ error: "Co PI not found" });
      }
    }
  }

  const errorObj = checkBudgetAllocation(
    body.approvedBudget,
    body.availableBudget,
    body.reservedBudget,
    body.totalExpenses,
    body.rABudget,
    body.conferenceBudget,
    body.softwareAndHardwareBudget,
    body.otherItemBudget
  );

  if (errorObj.error) {
    return response.status(400).json(errorObj);
  }

  const newGrant = {
    costCenter: body.costCenter,
    title: body.title,
    grantType: body.grantType,
    college: body.college,
    pi: body.pi.toString(),
    coPi: body.coPi || null,
    status: body.status,
    year: body.year,
    //BUDGET and EXPENSE FIELDS
    //MAIN BUDGET FIELDS
    approvedBudget: body.approvedBudget,
    availableBudget: body.availableBudget,
    totalExpenses: body.totalExpenses,
    reservedBudget: body.reservedBudget,
    //BUDGET CATEGORIES
    rABudget: body.rABudget,
    conferenceBudget: body.conferenceBudget,
    softwareAndHardwareBudget: body.softwareAndHardwareBudget,
    otherItemBudget: body.otherItemBudget,
    //EXPENSES
    expenses: body.expenses,
    //REQUESTS
    purchaseRequests: body.purchaseRequests,
    expenseRequests: body.expenseRequests,
    rARequests: body.rARequests,
    committed: body.committed,
    committedDetails: body.committedDetails,
  };

  Grant.findByIdAndUpdate(request.params.id, newGrant, {
    new: true,
  })
    .then((updatedGrant) => {
      updatedGrant.pi = foundPi;
      if (foundCoPi) {
        updatedGrant.coPi = foundCoPi;
      }
      return response.json(updatedGrant.toJSON());
    })
    .catch((error) => next(error));
});

module.exports = grantsRouter;
