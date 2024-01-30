const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const allMsg = []

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true
  }
});

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true
  })
);

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});
var roomno = 1;
io.on('connection', (socket) => {
  console.log(`a user connected ${socket.id}`);
  // socket.join('test')
  // socket.in('test').emit('test','room join')
  // socket.on('message', (msg)=>{
  //   // socket.broadcast.emit('message',msg)
  //   socket.to('test').emit(msg);
  //   console.log(msg);
  // })

  socket.join("room-"+roomno);
   //Send this event to everyone in the room.
  //  io.sockets.in("room-"+roomno).emit('connectToRoom', "You are in room no. "+roomno);

   socket.on('message', (msg)=>{
    console.log(msg);
    io.sockets.in("room-"+roomno).emit('connectToRoom', msg);
   })
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
