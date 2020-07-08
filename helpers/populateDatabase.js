const config = require("../utils/config");
const csv = require("csv-parser");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Grant = require("../models/Grant");
const User = require("../models/User");
const ExpenseRequest = require("../models/requests/ExpenseRequest");
const PurchaseRequest = require("../models/requests/PurchaseRequest");
const ResearchAssistantRequest = require("../models/requests/ResearchAssistantRequest");
const ReallocationRequest = require("../models/requests/ReallocationRequest");
const Comment = require("../models/Comment");

let passwordHash;

const grantArray = [];
const newUsers = [];
const names = [
  "Michael Scott",
  "Pam Beesly",
  "Jim Halpert",
  "Kevin Malone",
  "Oscar Martinez",
  "Angela Martin",
  "Dwight Schrute",
  "Kelly Kapoor",
  "Ryan Howard",
  "Creed Bratton",
  "Toby Flenderson",
  "Leslie Knope",
  "April Ludgate",
  "Andy Dwyer",
  "Ron Swanson",
  "Donna Meagle",
  "Anne Perkins",
  "Ben Wyatt",
  "Chris Traeger",
  "Gary Gergeich",
];
let index = 0;
mongoose
  .connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    passwordHash = await bcrypt.hash("1234567", 10);
    await deleteAllData();
    const nameObjects = names.map((name) => createUser(name));
    await Promise.all(nameObjects);
    console.log("added new users");
  })
  .then(async () => {
    fs.createReadStream("./grantsData.csv")
      .pipe(csv())
      .on("data", async (row) => {
        delete row["#"];
        const newGrant = new Grant(row);
        newGrant.year = setYear(newGrant.year);
        newGrant.pi = newUsers[index].id;
        newGrant.coPi = null;
        newGrant.totalExpenses =
          newGrant.approvedBudget - newGrant.availableBudget;
        grantArray.push(newGrant);
        index += 1;
      })
      .on("end", async () => {
        const grantObjects = grantArray.map(async (grant) => {
          await grant.save();
        });
        try {
          await Promise.all(grantObjects);
          console.log("added all grants");
        } catch (err) {
          console.log(err);
        }
        await mongoose.connection.close();
        console.log("CSV file successfully processed");
      });
  })
  .catch((error) => {
    console.log("error connection to MongoDB:", error.message);
  });

const createUser = async (piName) => {
  const newUserEmail =
    piName.split(" ")[0] + piName.split(" ")[1] + "@email.com";

  const user = {
    name: piName,
    email: newUserEmail,
    passwordHash,
    userType: "user",
  };
  try {
    const createdUser = await new User(user).save();
    newUsers.push(createdUser);
    return user;
  } catch (err) {
    console.log(err.message);
  }
};

const deleteAllData = async () => {
  await Grant.deleteMany({});
  console.log("deleted all grants");
  await PurchaseRequest.deleteMany({});
  await ResearchAssistantRequest.deleteMany({});
  await ExpenseRequest.deleteMany({});
  await ReallocationRequest.deleteMany({});
  await Comment.deleteMany({});
  console.log("deleted all comments");
  console.log("deleted all requests");
  await User.deleteMany({});
  console.log("deleted all users");
  const newAdmin = new User({
    name: "admin1",
    email: "admin1@admins.com",
    passwordHash,
    userType: "admin",
  });
  await newAdmin.save();
};

const setYear = (year) => {
  switch (year) {
    case "2016":
      return "2016/2017";

    case "2017":
      return "2017/2018";

    case "2018":
      return "2018/2019";

    case "2019":
      return "2019/2020";

    case "2020":
      return "2020/2021";
    default:
      return "2016/2017";
  }
};
