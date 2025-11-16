const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    eventName: String,
    fullName: String,
    rollNumber: String,
    address: String,
    collegeName: String,
    branch: String,
    section: String,
    email: String,
    amount: Number,
    orderId: String,
    paymentId: String,
    status: { type: String, default: "created" },
    paymentMethod: String,
    bank: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Registration", registrationSchema);
