const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 4,
    unique: true,
   
  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    unique: true,
    
  },
  passwordHash: { type: String, required: true, sparse: true },
  userType: { type: String, default: "user", required: true },
  gender: { type: String, default: null },
  phoneNumber: { type: Number, default: null },
  location: { type: String, default: null },
  role: { type: String, default: null },
});

userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.passwordHash;
  },
});

const User = mongoose.model("User", userSchema);

userSchema.plugin(uniqueValidator);
module.exports = User;
