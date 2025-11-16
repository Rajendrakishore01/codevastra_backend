require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Registration = require("./models/Registration");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected"))
  .catch((e) => console.error(e));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post("/api/registrations/create-order", async (req, res) => {
  try {
    const {
      eventName,
      fullName,
      rollNumber,
      address,
      collegeName,
      branch,
      section,
      email,
    } = req.body;

    const amount = 20 * 100;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `cv_${Date.now()}`,
    });

    const reg = await Registration.create({
      eventName,
      fullName,
      rollNumber,
      address,
      collegeName,
      branch,
      section,
      email,
      amount,
      orderId: order.id,
      status: "created",
    });

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      amount,
      orderId: order.id,
      registrationId: reg._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating order" });
  }
});

app.post("/api/registrations/verify", async (req, res) => {
  try {
    const {
      orderId,
      registrationId,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = orderId + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    await Registration.findByIdAndUpdate(registrationId, {
      status: "paid",
      paymentId: razorpay_payment_id,
      paymentMethod: payment.method,
      bank: payment.bank || payment.wallet || payment.vpa || "",
    });

    res.json({ message: "Payment verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error verifying payment" });
  }
});

app.get("/api/registrations", async (req, res) => {
  try {
    const regs = await Registration.find().sort({ createdAt: -1 });
    res.json(regs);
  } catch (err) {
    console.error("Error in /api/registrations :", err);
    res.status(500).json({ message: "Error fetching registrations" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));
