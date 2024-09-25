require('dotenv').config();
const http = require('http');
const { ExpressPeerServer } = require('peer');
const cors = require('cors');
const express = require('express');
const app = express();
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',  // Update this to be more secure if necessary
    methods: ['GET', 'POST'],
  },
});
const { v4: uuid } = require('uuid');

const userMap = new Map();

// Apply CORS to allow connections
app.use(cors({
  origin: '*', // Or specify exact origin for better security
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Serve the root route
app.get('/', (req, res) => {
  res.send("yo what's up");
});

// Set up PeerJS server
const peerServer = ExpressPeerServer(server, {
  path: '/peerjs',  // Correct path
  allow_discovery: true,  // Optional, allows peer discovery
  key: 'peerjs',  // This is a custom key for PeerJS. You can adjust as needed.
});

// Mount PeerJS server to the express app
app.use('/peerjs', peerServer);

peerServer.on('connection', (client) => {
  console.log('New peer connected:', client.id);
});

peerServer.on('disconnect', (client) => {
  console.log('Peer disconnected:', client.id);
});

// Set up Socket.IO server
io.on('connection', (socket) => {
  console.log(`New socket connection: ${socket.id}`);

  const peerId = uuid();
  socket.emit('server:join-peer', { peerId });

  const connectedUsers = userMap.get('lobby') || [];
  const socketId = socket.id;
  userMap.set('lobby', [...connectedUsers, { socketId, peerId }]);

  if (userMap.get('lobby').length === 2) {
    const remotePeerId = userMap.get('lobby')[0].peerId;
    socket.emit('server:sufficient:users', { remotePeerId });
  }

  socket.on('disconnect', () => {
    const usersLeft = userMap.get('lobby').filter(user => user.socketId !== socket.id);
    userMap.set('lobby', usersLeft);

    io.emit('user:left', { socketId });
    console.log(`User disconnected. Connected users: ${usersLeft.length}`);
  });
});

// Start server on the specified port
const port = process.env.PORT || 8000;  // Fallback port to 8000 for local dev
server.listen(port, () => {
  console.log(`Server started on port: ${port}`);
});
