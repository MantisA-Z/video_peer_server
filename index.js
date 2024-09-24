require('dotenv').config()
const http = require('http');
const {PeerServer} = require('peer')
const cors = require('cors');
const express = require('express');
const app = express()
const {Server} = require('socket.io')
const server = http.createServer(app)
const io = new Server(server, {
    cors: true
})
const {v4: uuid} = require('uuid')

const userMap = new Map()

app.use(cors())

app.get('/', (req, res) => {
    res.send('yo what\'s us')
})

const peerServer = PeerServer({port: process.env.PEER_SERVER_PORT, path: '/peerjs', server: process.env.PEER_SERVER_URL})
peerServer.on('connection', (client) => {
    console.log('New peer connected:', client.id);
});

peerServer.on('disconnect', (client) => {
    console.log('Peer disconnected:', client.id);
});

peerServer.on('error', (err) => {
    console.error('PeerJS error:', err);
});


io.on('connection', (socket) => {
    console.log(`new socket connection: ${socket.id}`);

    const peerId = uuid();
    socket.emit('server:join-peer', {peerId})

    const connectedUsers = userMap.get('lobby') || []
    const socketId = socket.id;
    userMap.set('lobby', [...connectedUsers, {socketId, peerId}]);

    if(userMap.get('lobby').length === 2){
        const remotePeerId = userMap.get('lobby')[0].peerId;
        socket.emit('server:sufficient:users', {remotePeerId})
    }

    socket.on('disconnect', () => {
        // Filter out the disconnected user
        const usersLeft = userMap.get('lobby').filter((user) => user.socketId !== socket.id);
        
        // Update userMap with the filtered list
        userMap.set('lobby', usersLeft);
        
        // Emit an event that a user has left (if needed)
        io.emit('user:left', { socketId }); // Optionally send the socketId of the user that left
        console.log(`User disconnected. Connected users: ${usersLeft}`);
    });
    
})

const port = process.env.PORT;

server.listen(port, () => {
    console.log(`server started on port: ${port}`)
})