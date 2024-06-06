import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

const server = createServer(app);
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {

  socket.on("join-room", (room) => {
    socket.join(room)
  })

  socket.on("draw", ({ ele, room }) => {

    socket.to(room).emit("return-draw", { ele });

  })

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

})


server.listen(3000, () => {
  console.log("listening on Port: 3000");
});
