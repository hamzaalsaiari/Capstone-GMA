require("dotenv").config();

let PORT = process.env.PORT;
let MONGODB_URI = process.env.MONGODB_URI;
let SECRET = process.env.SECRET;
let SECRET2 = process.env.SECRET2;

module.exports = {
  MONGODB_URI,
  PORT,
  SECRET,
  SECRET2
};
