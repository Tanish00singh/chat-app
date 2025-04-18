const socket = io();

// Elements
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const userList = document.getElementById('user-list');
const onlineUsers = document.getElementById('online-users');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const chatBox = document.getElementById('chat-box');
const currentUserElement = document.getElementById('current-user');
const messagesElement = document.getElementById('messages');
const chatWithElement = document.getElementById('chat-with');

let currentUser = null;
let currentChat = null;

// Handle login
document.getElementById('login-btn').onclick = () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  fetch('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      currentUser = username;
      socket.emit('login', currentUser);
      currentUserElement.innerText = currentUser;
      loginContainer.style.display = 'none';
      chatContainer.style.display = 'block';
    } else {
      alert(data.message);
    }
  });
};
// Get user list
socket.on('user list', (users) => {
  userList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user;
    const button = document.createElement('button');
    button.textContent = 'Chat';
    button.onclick = () => startChat(user);
    li.appendChild(button);
    userList.appendChild(li);
  });
});

// Emit online users list when a user logs in
socket.on('online users', (users) => {
  onlineUsers.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user;
    onlineUsers.appendChild(li);
  });
});

// Start a chat
function startChat(user) {
  currentChat = user;
  chatWithElement.innerText = `Chat with ${user}`;
  chatBox.style.display = 'block';

  // Get chat history
  socket.emit('get chat history', { from: currentUser, to: user });
}

// Display chat history
socket.on('chat history', (messages) => {
  messagesElement.innerHTML = '';
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.textContent = `${msg.timestamp}: ${msg.sender}: ${msg.message}`;
    messagesElement.appendChild(div);
  });
});

// Send message
sendBtn.onclick = () => {
  const message = messageInput.value;
  socket.emit('private message', { to: currentChat, message });
  messageInput.value = '';
};

// Display received private message
socket.on('private message', (data) => {
  const { from, to, message, timestamp } = data;
  const div = document.createElement('div');
  div.textContent = `${timestamp} - ${from}: ${message}`;
  messagesElement.appendChild(div);
});

