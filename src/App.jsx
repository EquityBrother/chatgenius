import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ThreadPanel from './components/ThreadPanel';

// Common emoji reactions
const commonEmojis = ['👍', '❤️', '😂', '🎉', '🤔', '😢'];

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [activeThread, setActiveThread] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetch('http://localhost:3000/auth/user', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          initializeSocket(data.user);
        }
      })
      .catch(err => console.error('Error checking auth status:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSocket = (currentUser) => {
    console.log('Initializing socket connection...');
    socketRef.current = io('http://localhost:3000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server with ID:', socketRef.current.id);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('initialize-messages', (initialMessages) => {
      setMessages(initialMessages);
    });

    socketRef.current.on('message', (messageData) => {
      console.log('Received message:', messageData);
      setMessages(prev => [...prev, messageData]);
    });

    socketRef.current.on('userJoined', ({ user: joinedUser, onlineUsers: updatedUsers }) => {
      console.log('User joined:', joinedUser);
      console.log('Updated online users:', updatedUsers);
      setOnlineUsers(updatedUsers);
    });

    socketRef.current.on('userLeft', ({ user: leftUser, onlineUsers: updatedUsers }) => {
      console.log('User left:', leftUser);
      console.log('Updated online users:', updatedUsers);
      setOnlineUsers(updatedUsers);
    });

    socketRef.current.on('reaction-updated', ({ messageId, reactions }) => {
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, reactions } 
            : msg
        )
      );
    });

    socketRef.current.on('thread-updated', ({ messageId, thread }) => {
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, thread } 
            : msg
        )
      );
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  };

  const handleGuestLogin = async () => {
    if (guestName.trim()) {
      try {
        const response = await fetch('http://localhost:3000/auth/guest', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: guestName })
        });

        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          initializeSocket(data.user);
        }
      } catch (error) {
        console.error('Error logging in as guest:', error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      setUser(null);
      setMessages([]);
      setNewMessage('');
      setOnlineUsers([]);
      setShowGuestInput(false);
      setGuestName('');
      setActiveThread(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socketRef.current?.connected) {
      const messageData = {
        content: newMessage,
        sender: user,
        timestamp: new Date().toISOString(),
      };
      console.log('Emitting message:', messageData);
      socketRef.current.emit('message', messageData);
      setNewMessage('');
    }
  };

  const handleReaction = (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    const hasReacted = message.reactions[emoji]?.includes(user.id);

    if (hasReacted) {
      socketRef.current.emit('remove-reaction', {
        messageId,
        reaction: emoji,
        userId: user.id
      });
    } else {
      socketRef.current.emit('add-reaction', {
        messageId,
        reaction: emoji,
        userId: user.id
      });
    }
    setShowEmojiPicker(null);
  };

  const EmojiPicker = ({ messageId }) => (
    <div className="absolute bottom-full mb-2 bg-white rounded-lg shadow-lg border p-2 flex gap-1">
      {commonEmojis.map(emoji => (
        <button
          key={emoji}
          onClick={() => handleReaction(messageId, emoji)}
          className="hover:bg-gray-100 p-1 rounded"
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  const MessageReactions = ({ messageId, reactions }) => (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(reactions || {}).map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => handleReaction(messageId, emoji)}
          className={`flex items-center space-x-1 text-sm px-2 py-1 rounded-full 
            ${users.includes(user.id) 
              ? 'bg-blue-100 hover:bg-blue-200' 
              : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          <span>{emoji}</span>
          <span>{users.length}</span>
        </button>
      ))}
    </div>
  );

  const UserSidebar = () => (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Online Users</h2>
        <p className="text-sm text-gray-400">{onlineUsers.length} online</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {onlineUsers.map((onlineUser) => (
          <div
            key={onlineUser.id}
            className={`p-3 flex items-center space-x-3 hover:bg-gray-700 ${
              onlineUser.id === user?.id ? 'bg-gray-700' : ''
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="truncate">
              {onlineUser.id === user?.id ? `${onlineUser.name} (you)` : onlineUser.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-96 bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center mb-6">ChatGenius</h1>
          <div className="space-y-4">
            {showGuestInput ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGuestLogin()}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <button 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                  onClick={handleGuestLogin}
                  disabled={!guestName.trim()}
                >
                  Join as Guest
                </button>
                <button 
                  className="w-full text-gray-600 hover:text-gray-800"
                  onClick={() => setShowGuestInput(false)}
                >
                  Back
                </button>
              </div>
            ) : (
              <>
                <a
                  href="http://localhost:3000/auth/google"
                  className="w-full flex items-center justify-center bg-white hover:bg-gray-50 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded shadow-sm"
                >
                  <img
                    src="https://developers.google.com/identity/images/g-logo.png"
                    alt="Google Logo"
                    className="w-6 h-6 mr-2"
                  />
                  Sign in with Google
                </a>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                  </div>
                </div>
                <button 
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  onClick={() => setShowGuestInput(true)}
                >
                  Continue as Guest
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      <UserSidebar />
      <div className={`flex-1 flex flex-col ${activeThread ? 'hidden md:flex' : ''}`}>
        <div className="bg-white border-b px-4 py-2 shadow-sm flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">ChatGenius</h2>
            <p className="text-sm text-gray-600">
              {user.name} {user.email && `• ${user.email}`}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {user.avatar && (
              <img
                src={user.avatar}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
            )}
            <button 
              className="text-gray-600 hover:text-gray-800 px-4 py-2"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white p-4 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
              >
                <div className="relative group">
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender.id === user.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      {message.sender.avatar && (
                        <img 
                          src={message.sender.avatar} 
                          alt="Avatar" 
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <div className="text-sm font-semibold">
                        {message.sender.id === user.id ? 'You' : message.sender.name}
                      </div>
                    </div>
                    <div>{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="mt-1 flex items-center space-x-2">
                      <MessageReactions messageId={message.id} reactions={message.reactions} />
                      <button
                        onClick={() => setActiveThread(message.id)}
                        className="text-sm hover:underline"
                      >
                        {message.thread?.replyCount 
                          ? `${message.thread.replyCount} ${message.thread.replyCount === 1 ? 'reply' : 'replies'}` 
                          : 'Reply in thread'}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                    className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                  >
                    😀
                  </button>
                  
                  {showEmojiPicker === message.id && (
                    <EmojiPicker messageId={message.id} />
                  )}
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

      {/* Thread Panel */}
      {activeThread && (
        <div className="w-full md:w-96 border-l flex flex-col">
          <ThreadPanel
            message={messages.find(m => m.id === activeThread)}
            onClose={() => setActiveThread(null)}
            user={user}
            socketRef={socketRef}
          />
        </div>
      )}
    </div>
  );
};

export default App;