import http from 'http';
import {join, resolve} from "path";
import express from 'express';
import {Server} from 'socket.io';

const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use('/public', express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(join(resolve(), 'public/index.html'));
})

io.on('connection', (socket) => {
  const {room} = socket.handshake.query || 'default';
  socket.join(room);
  console.log(`New connection on ${room} room.`);

  socket.on('disconnect', () => {
    console.log('Disconnected.');
  })

  socket.on('message', (msg) => {
    io.to(room).emit('message', msg);
    console.log(`Message forwarded to ${room}.`);
  })
});

server.listen(port, () => {
  console.log(`Listening on ${port}.`);
});

