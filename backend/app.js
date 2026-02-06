const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const monitorRoutes = require("./routes/MonitorRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/monitors", monitorRoutes);

module.exports = app;
