import http from 'http';
import {join, resolve} from "path";
import express from 'express';
import {Server} from 'socket.io';
import {generate, count} from "random-words";

const port = process.env.PORT || 19999;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

app.use('/public', express.static('public'));
app.get('/', (req, res) => {
  return res.sendFile(join(resolve(), 'public/index.html'));
})

app.get('/word', (req, res) => {
  return res.send(generate());
});

io.on('connection', (socket) => {
  const {room} = socket.handshake.query || 'default';

  socket.join(room);
  console.log(`New connection on ${room} room.`);

  socket.on('disconnect', () => {
    console.log('Disconnected.');
  })

  socket.on('chat', (msg) => {
    io.to(room).emit('chat', msg);
    console.log(`Chat forwarded to ${room}.`);
  });

  socket.on('message', (msg) => {
    socket.broadcast.to(room).emit('message', msg);
    console.log(`Message broadcast to ${room}.`);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Listening on ${port}.`);
});

