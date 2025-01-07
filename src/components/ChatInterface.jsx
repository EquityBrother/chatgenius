import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const ChatInterface = ({ user, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Create socket connection
    socketRef.current = io('http://localhost:3000');

    // Join the chat
    socketRef.current.emit('join', user);

    // Listen for messages
    socketRef.current.on('message', (message) => {
      console.log('Received message:', message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Listen for user joined events
    socketRef.current.on('userJoined', ({ user: joinedUser, onlineUsers: users }) => {
      setOnlineUsers(users);
    });

    // Listen for user left events
    socketRef.current.on('userLeft', ({ user: leftUser, onlineUsers: users }) => {
      setOnlineUsers(users);
    });

    // Cleanup on unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socketRef.current) {
      const messageData = {
        content: newMessage,
        sender: user,
        timestamp: new Date().toISOString(),
      };
      
      socketRef.current.emit('message', messageData);
      setNewMessage('');
    }
  };

  return (
    <div className="w-full max-w-4xl h-screen flex flex-col">
      <div className="bg-white p-4 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">ChatGenius</h2>
          <p className="text-sm text-gray-600">
            Logged in as {user.name} • {onlineUsers.length} online
          </p>
        </div>
        <button 
          className="text-gray-600 hover:text-gray-800 px-4 py-2"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>

      <div className="flex-1 mt-4 bg-white rounded-lg shadow-md p-4 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender.id === user.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100'
                }`}
              >
                <div className="text-sm font-semibold mb-1">
                  {message.sender.id === user.id ? 'You' : message.sender.name}
                </div>
                <div>{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;