const mongoose = require("mongoose");

const MonitorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  url: { type: String, required: true },
  email: { type: String, required: true },
  targetPrice: { type: Number, required: true },
  currentPrice: { type: Number, default: 0 },
  priceHistory: [
    {
      price: Number,
      date: { type: Date, default: Date.now },
    },
  ],
  lastChecked: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Monitor", MonitorSchema);
