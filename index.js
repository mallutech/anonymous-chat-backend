import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Queues for gender-based matching
const maleQueue = [];
const femaleQueue = [];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join', (gender) => {
    socket.gender = gender;

    const queue = gender === 'male' ? femaleQueue : maleQueue;
    if (queue.length > 0) {
      const partner = queue.shift();

      socket.partner = partner.id;
      partner.partner = socket.id;

      socket.emit('matched');
      partner.emit('matched');
    } else {
      (gender === 'male' ? maleQueue : femaleQueue).push(socket);
    }
  });

  socket.on('message', (msg) => {
    if (socket.partner) {
      io.to(socket.partner).emit('message', msg);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    if (socket.partner) {
      io.to(socket.partner).emit('partner-disconnected');
      const partnerSocket = io.sockets.sockets.get(socket.partner);
      if (partnerSocket) {
        partnerSocket.partner = null;
      }
    }
    // Clean up queues
    if (socket.gender === 'male') {
      const index = maleQueue.indexOf(socket);
      if (index !== -1) maleQueue.splice(index, 1);
    } else {
      const index = femaleQueue.indexOf(socket);
      if (index !== -1) femaleQueue.splice(index, 1);
    }
  });
});

httpServer.listen(3000, () => {
  console.log('Server running on port 3000');
});
      
