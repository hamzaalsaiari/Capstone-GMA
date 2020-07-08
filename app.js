const config = require("./utils/config");
const express = require("express");
const bodyParser = require("body-parser");
const history = require("connect-history-api-fallback");
const app = express();
const multer = require("multer");
const cors = require("cors");
const mongoose = require("mongoose");

const ResearchAssistantRequest = require("./models/requests/ResearchAssistantRequest");
const ExpenseRequest = require("./models/requests/ExpenseRequest");
const PurchaseRequest = require("./models/requests/PurchaseRequest");
const ReallocationRequest = require("./models/requests/ReallocationRequest");

const grantsRouter = require("./controllers/grants");
const usersRouter = require("./controllers/users");
const adminsRouter = require("./controllers/admin");
const loginRouter = require("./controllers/login");
const researchRequestsRouter = require("./controllers/requests/researchRequests");
const purchaseRequestsRouter = require("./controllers/requests/purchaseRequests");
const expenseRequestsRouter = require("./controllers/requests/expenseRequests");
const reallocationRequestsRouter = require("./controllers/requests/reallocationRequests");
const commentsRouter = require("./controllers/comments");
const filesRouter = require("./controllers/files");

const middleware = require("./utils/middleware");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public");
  },
  filename: (req, file, cb) => {
    console.log(file);
    cb(null, file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype ==
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.mimetype ==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const upload = multer({ storage: storage, fileFilter: fileFilter });

mongoose
  .connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connection to MongoDB:", error.message);
  });

app.use(history()); //
app.use(cors());
app.use(express.static("build")); //

app.use(bodyParser.json());

app.use(middleware.requestLogger);

app.use("/files", filesRouter);

app.use("/api/login", loginRouter);

app.post("/upload", upload.single("file"), (req, res, next) => {
  try {
    return res.status(201).json({
      message: "File uploded successfully",
    });
  } catch (error) {
    console.error(error);
  }
});

app.use(middleware.tokenValidator);
app.use("/api/users", usersRouter);
app.use("/api/admins", adminsRouter);
app.use("/api/requests/research", researchRequestsRouter);
app.use("/api/requests/expense", expenseRequestsRouter);
app.use("/api/requests/purchase", purchaseRequestsRouter);
app.use("/api/requests/reallocation", reallocationRequestsRouter);

app.get(
  "/api/requests/counter/requeststatus",
  async (request, response, next) => {
    const requestStatusCounter = {
      Approved: 0,
      Denied: 0,
      Pending: 0,
    };
    const rar = await ResearchAssistantRequest.find({});
    const pr = await PurchaseRequest.find({});
    const er = await ExpenseRequest.find({});
    const rr = await ReallocationRequest.find({});
    let reqArray = [rar, pr, er, rr];
    reqArray.forEach((reqType) => {
      reqType.forEach((req) => {
        requestStatusCounter[req.status] += 1;
      });
    });

    return response.json(requestStatusCounter);
  }
);

app.get(
  "/api/requests/counter/requestcounter",
  async (request, response, next) => {
    const requestStatusCounter = {
      ResearchAssistantRequest: 0,
      PurchaseRequest: 0,
      ExpenseRequest: 0,
      ReallocationRequest: 0,
    };
    const rar = await ResearchAssistantRequest.find({});
    const pr = await PurchaseRequest.find({});
    const er = await ExpenseRequest.find({});
    const rr = await ReallocationRequest.find({});

    requestStatusCounter.ResearchAssistantRequest = rar.length;
    requestStatusCounter.PurchaseRequest = pr.length;
    requestStatusCounter.ExpenseRequest = er.length;
    requestStatusCounter.ReallocationRequest = rr.length;

    return response.json(requestStatusCounter);
  }
);

app.use("/api/grants", grantsRouter);
app.use("/api/comments", commentsRouter);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

module.exports = app;
