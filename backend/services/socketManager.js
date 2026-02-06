const jwt = require("jsonwebtoken");

const userSockets = new Map();

const initSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("registerUser", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userSockets.set(decoded.user.id, socket.id);
      } catch {}
    });

    socket.on("disconnect", () => {
      for (let [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) userSockets.delete(userId);
      }
    });
  });
};

const emitPriceUpdate = (io, monitor) => {
  const socketId = userSockets.get(monitor.user.toString());
  if (socketId) io.to(socketId).emit("priceUpdate", monitor);
};

module.exports = { initSocket, emitPriceUpdate };
