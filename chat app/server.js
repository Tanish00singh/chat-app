const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize SQLite database
const db = new sqlite3.Database('./chat.db');

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nameTEXT UNIQUE,
    password TEXT
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT,
    receiver TEXT,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

const onlineUsers = {}; // name-> socket

// Handle user signup
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function(err) {
    if (err) {
      return res.json({ success: false, message: 'namealready taken' });
    }
    res.json({ success: true });
  });
});

// Handle user login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE name= ? AND password = ?`, [username, password], (err, row) => {
    if (row) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  });
});

// Handle socket connections
io.on('connection', (socket) => {
  socket.on('login', (username) => {
    socket.name= username;
    onlineUsers[username] = socket;

    // Send all users excluding the current one
    db.all(`SELECT nameFROM users WHERE name!= ?`, [username], (err, rows) => {
      const allUsers = rows.map(r => r.username);
      socket.emit('user list', allUsers);
    });

    // Emit online users to everyone
    io.emit('online users', Object.keys(onlineUsers));

    socket.on('disconnect', () => {
      delete onlineUsers[username];
      io.emit('online users', Object.keys(onlineUsers));
    });
  });

  // Handle private messages
  socket.on('private message', ({ to, message }) => {
    const from = socket.username;
    // Store in DB
    db.run(`INSERT INTO messages (sender, receiver, message) VALUES (?, ?, ?)`, [from, to, message]);

    // Send to the recipient if online
    if (onlineUsers[to]) {
      onlineUsers[to].emit('private message', { from, to, message, timestamp: new Date().toISOString() });
    }

    // Echo back to sender (so they see their own message)
    socket.emit('private message', { from, to, message, timestamp: new Date().toISOString() });
  });

  // Fetch message history
  socket.on('get chat history', ({ from, to }) => {
    db.all(`SELECT sender, receiver, message, timestamp FROM messages 
            WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?) 
            ORDER BY timestamp ASC`, [from, to, to, from], (err, rows) => {
      socket.emit('chat history', rows);
    });
  });
});

// Start the server
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
