import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ThreadPanel from './components/ThreadPanel';
import DirectMessagePanel from './components/DirectMessagePanel';
import FileUploader from './components/FileUploader';
import SearchComponent from './components/SearchComponent';
import { MessageSquare, File, Search as SearchIcon, X } from 'lucide-react';

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
  const [showDMs, setShowDMs] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    console.log('Starting auth check...');
    fetch('http://3.141.200.115/auth/user', {
      credentials: 'include'
    })
      .then(res => {
        console.log('Auth response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('Auth data received:', data);
        if (data.user) {
          console.log('Setting user:', data.user);
          setUser(data.user);
          console.log('Initializing socket for user:', data.user);
          initializeSocket(data.user);
        } else {
          console.log('No user data received');
        }
      })
      .catch(err => {
        console.error('Error in auth check:', err);
      })
      .finally(() => {
        console.log('Auth check completed, setting loading to false');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSocket = (currentUser) => {
    console.log('Initializing socket connection with user:', currentUser);
    socketRef.current = io('http://3.141.200.115', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

    socketRef.current.on('connect', () => {
      console.log('Socket connected successfully');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('initialize-messages', (initialMessages) => {
      console.log('Received initial messages:', initialMessages);
      setMessages(initialMessages);
    });

    socketRef.current.on('message', (messageData) => {
      console.log('Received message:', messageData);
      setMessages(prev => [...prev, messageData]);
    });

    socketRef.current.on('userJoined', ({ user: joinedUser, onlineUsers: updatedUsers }) => {
      console.log('User joined:', joinedUser);
      console.log('Current online users:', updatedUsers);
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

    socketRef.current.on('file-upload-complete', (fileData) => {
      console.log('File upload complete:', fileData);
      setSelectedFile(fileData);
    });

    socketRef.current.on('file-upload-error', (error) => {
      console.error('File upload error:', error);
      alert('Error uploading file');
    });

    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
      }
    };
  };

  const handleGuestLogin = async () => {
    if (guestName.trim()) {
      try {
        const response = await fetch('http://3.141.200.115/auth/guest', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: guestName })
        });

        const data = await response.json();
        if (data.user) {
          console.log('Guest login successful:', data.user);
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
      await fetch('http://3.141.200.115/auth/logout', {
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
      setShowDMs(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if ((newMessage.trim() || selectedFile) && socketRef.current?.connected) {
      const messageData = {
        content: newMessage,
        sender: user,
        timestamp: new Date().toISOString(),
        file: selectedFile
      };
      console.log('Sending message:', messageData);
      socketRef.current.emit('message', messageData);
      setNewMessage('');
      setSelectedFile(null);
      setShowFileUploader(false);
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

  const handleSearchResult = (result) => {
    if (result.file) {
      // Handle file result
      window.open(`http://3.141.200.115${result.file.url}`, '_blank');
    } else {
      // Handle message result
      const messageElement = document.getElementById(`message-${result.id}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth' });
        messageElement.classList.add('highlight');
        setTimeout(() => {
          messageElement.classList.remove('highlight');
        }, 2000);
      }
    }
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

  const FileAttachment = ({ file }) => {
    const isImage = file.type.startsWith('image/');

    return (
      <div className="mt-2 border rounded-lg p-2 bg-gray-50">
        <div className="flex items-center space-x-2">
          <File className="w-5 h-5 text-gray-500" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{file.name}</div>
            <div className="text-xs text-gray-500">
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <a
            href={`http://localhost:3000${file.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isImage ? 'View' : 'Download'}
          </a>
        </div>
        {isImage && (
          <img
            src={`http://3.141.200.115${file.url}`}
            alt={file.name}
            className="mt-2 max-w-sm rounded"
          />
        )}
      </div>
    );
  };

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
                  href="http://3.141.200.115/auth/google"
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
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">ChatGenius</h2>
          <p className="text-sm text-gray-400">{onlineUsers.length} online</p>
        </div>

        {/* Online Users */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="text-gray-400 text-sm mb-2">Online Users</div>
            {onlineUsers.map((onlineUser) => (
              <div
                key={onlineUser.id}
                className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-700 cursor-pointer"
                onClick={() => {
                  if (onlineUser.id !== user.id) {
                    setShowDMs(true);
                    setActiveThread(null);
                  }
                }}
              >
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>
                  {onlineUser.id === user.id ? `${onlineUser.name} (you)` : onlineUser.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {user.avatar && (
                <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full" />
              )}
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-gray-400 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${(activeThread || showDMs) ? 'hidden md:flex' : 'flex'}`}>
        <div className="bg-white border-b px-4 py-2 shadow-sm flex items-center justify-between">
          <h2 className="text-xl font-bold">Main Channel</h2>
          <SearchComponent
            socketRef={socketRef}
            onResultClick={handleSearchResult}
          />
        </div>

        <div className="flex-1 bg-white p-4 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                id={`message-${message.id}`}
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
                    {message.file && <FileAttachment file={message.file} />}
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

          {showFileUploader && (
            <div className="mb-4">
              <FileUploader
                onUpload={(file) => {
                  setSelectedFile(file);
                  setShowFileUploader(false);
                }}
                socketRef={socketRef}
                user={user}
              />
            </div>
          )}

          <form onSubmit={sendMessage} className="space-y-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowFileUploader(!showFileUploader)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <File className="w-5 h-5" />
              </button>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim() && !selectedFile}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                Send
              </button>
            </div>
            {selectedFile && (
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex items-center space-x-2">
                  <File className="w-4 h-4 text-gray-500" />
                  <span className="text-sm truncate">{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
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

      {/* Direct Messages Panel */}
      {showDMs && (
        <div className="w-full md:w-96 border-l flex flex-col">
          <DirectMessagePanel
            user={user}
            onlineUsers={onlineUsers}
            socketRef={socketRef}
            onClose={() => setShowDMs(false)}
          />
        </div>
      )}
    </div>
  );
};

export default App;
