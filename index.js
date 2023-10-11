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
  const id = socket.handshake.query.id;
  const room = socket.handshake.query.room || 'default';

  socket.join(room);
  io.to(room).emit('chat-notice', `${id || 'Unknown user'} joined.`);

  socket.on('disconnect', () => {
    io.to(room).emit('chat-notice', `${id || 'Unknown user'} left the room.`);
  })

  socket.on('chat', (msg) => {
    io.to(room).emit('chat', msg);
  });

  socket.on('chat-file', async (msg, callback) => {
    socket.broadcast.to(room).emit('chat-file', msg); // exclude sender.
    callback();
  })

  socket.on('message', (msg) => {
    socket.broadcast.to(room).emit('message', msg); // exclude sender.
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Listening on ${port}.`);
});

