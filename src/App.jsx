import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Hash, Plus, ChevronDown, ChevronRight, X } from 'lucide-react';

const CreateChannelModal = ({ isOpen, onClose, onSubmit }) => {
  const [channelName, setChannelName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [description, setDescription] = useState('');


  
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: channelName.toLowerCase().replace(/\s+/g, '-'),
      isPrivate,
      description
    });
    setChannelName('');
    setIsPrivate(false);
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Create a Channel</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel Name
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="e.g. project-updates"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="private-channel"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="private-channel" className="ml-2 block text-sm text-gray-900">
              Make private
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              disabled={!channelName.trim()}
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ChannelSidebar = ({ 
  channels = [], 
  directMessages = [], 
  activeChannel = null,
  onChannelSelect,
  onCreateChannel,
  onCreateDM,
  currentUser 
}) => {
  const [showChannels, setShowChannels] = useState(true);
  const [showDMs, setShowDMs] = useState(true);
  
  return (
    <div className="w-64 bg-gray-800 text-gray-300 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-700">
        <h1 className="text-white font-bold text-xl">ChatGenius</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between py-2 hover:text-white cursor-pointer"
               onClick={() => setShowChannels(!showChannels)}>
            <div className="flex items-center gap-1">
              {showChannels ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="text-sm font-medium">Channels</span>
            </div>
            <Plus 
              size={16} 
              className="hover:bg-gray-700 rounded p-1" 
              onClick={(e) => {
                e.stopPropagation();
                onCreateChannel();
              }}
            />
          </div>
          
          {showChannels && (
            <div className="space-y-1 ml-2">
              {channels.map(channel => (
                <div
                  key={channel.id}
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                    activeChannel?.id === channel.id 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-700'
                  }`}
                  onClick={() => onChannelSelect(channel)}
                >
                  <Hash size={16} />
                  <span className="text-sm">{channel.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-4 py-2">
          <div className="flex items-center justify-between py-2 hover:text-white cursor-pointer"
               onClick={() => setShowDMs(!showDMs)}>
            <div className="flex items-center gap-1">
              {showDMs ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="text-sm font-medium">Direct Messages</span>
            </div>
            <Plus 
              size={16} 
              className="hover:bg-gray-700 rounded p-1" 
              onClick={(e) => {
                e.stopPropagation();
                onCreateDM();
              }}
            />
          </div>
          
          {showDMs && (
            <div className="space-y-1 ml-2">
              {directMessages.map(dm => (
                <div
                  key={dm.id}
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                    activeChannel?.id === dm.id 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-700'
                  }`}
                  onClick={() => onChannelSelect(dm)}
                >
                  <MessageCircle size={16} />
                  <span className="text-sm">
                    {dm.participants
                      .filter(p => p.id !== currentUser.id)
                      .map(p => p.name)
                      .join(', ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [channels, setChannels] = useState([
    { id: 'general', name: 'general', description: 'General discussion' }
  ]);
  const [directMessages, setDirectMessages] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState({
    general: []
  });
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

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

        if (!response.ok) {
          throw new Error('Failed to login as guest');
        }

        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          setActiveChannel({
            id: 'general',
            name: 'general',
            description: 'General discussion'
          });
          initializeSocket(data.user);
        }
      } catch (error) {
        console.error('Error logging in as guest:', error);
        alert('Failed to login as guest. Please try again.');
      }
    }
  };

  const initializeSocket = (currentUser) => {
    console.log('Initializing socket connection...', currentUser);
    
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Create new socket connection
    socketRef.current = io('http://localhost:3000', {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
      // Join general channel by default
      socketRef.current.emit('join-channel', { channelId: 'general' });
    });

    socketRef.current.on('message', (messageData) => {
      console.log('Received message:', messageData);
      setMessages(prev => ({
        ...prev,
        [messageData.channelId]: [
          ...(prev[messageData.channelId] || []),
          messageData
        ]
      }));
    });

    socketRef.current.on('userJoined', ({ user: joinedUser, onlineUsers }) => {
      console.log('User joined:', joinedUser);
      setOnlineUsers(onlineUsers);
    });

    socketRef.current.on('userLeft', ({ user: leftUser, onlineUsers }) => {
      console.log('User left:', leftUser);
      setOnlineUsers(onlineUsers);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  };

  const handleCreateChannel = (channelData) => {
    const newChannel = {
      id: channelData.name,
      ...channelData
    };
    setChannels(prev => [...prev, newChannel]);
    setActiveChannel(newChannel);
  };

  const handleChannelSelect = (channel) => {
    setActiveChannel(channel);
    if (!messages[channel.id]) {
      setMessages(prev => ({
        ...prev,
        [channel.id]: []
      }));
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    console.log('Attempting to send message');
    console.log('Socket connected:', socketRef.current?.connected);
    console.log('Active channel:', activeChannel);
    console.log('Message:', newMessage);

    if (newMessage.trim() && socketRef.current?.connected && activeChannel) {
      const messageData = {
        content: newMessage,
        channelId: activeChannel.id,
        sender: user,
        timestamp: new Date().toISOString(),
      };

      console.log('Emitting message:', messageData);
      socketRef.current.emit('message', messageData);

      // Optimistically add message to state
      setMessages(prev => ({
        ...prev,
        [activeChannel.id]: [
          ...(prev[activeChannel.id] || []),
          messageData
        ]
      }));

      setNewMessage('');
    } else {
      console.log('Message not sent - conditions not met');
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
      setMessages({});
      setChannels([]);
      setDirectMessages([]);
      setActiveChannel(null);
      setNewMessage('');
      setOnlineUsers([]);
      setShowGuestInput(false);
      setGuestName('');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    if (user) {
      const cleanup = initializeSocket(user);
      return () => {
        cleanup();
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user]); // Only reinitialize when user changes

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
      <ChannelSidebar
        channels={channels}
        directMessages={directMessages}
        activeChannel={activeChannel}
        onChannelSelect={handleChannelSelect}
        onCreateChannel={() => setShowChannelModal(true)}
        onCreateDM={() => {/* Handle DM creation */}}
        currentUser={user}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-4 py-2 shadow-sm flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center">
              {activeChannel ? (
                <>
                  {activeChannel.id.startsWith('dm-') ? (
                    <MessageCircle className="mr-2" size={20} />
                  ) : (
                    <Hash className="mr-2" size={20} />
                  )}
                  {activeChannel.name}
                </>
              ) : (
                'Select a channel'
              )}
            </h2>
            {activeChannel?.description && (
              <p className="text-sm text-gray-600">{activeChannel.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user.avatar && (
              <img
                src={user.avatar}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
            )}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">{user.name}</span>
            </div>
            <button 
              className="text-gray-600 hover:text-gray-800 px-4 py-2"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeChannel && messages[activeChannel.id]?.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex ${message.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] rounded-lg p-3 ${
                message.sender.id === user.id ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  {message.sender.avatar && (
                    <img 
                      src={message.sender.avatar} 
                      alt="Avatar"
                      className="w-6 h-6 rounded-full" 
                    />
                  )}
                  <span className="font-semibold">
                    {message.sender.id === user.id ? 'You' : message.sender.name}
                  </span>
                </div>
                <p>{message.content}</p>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {activeChannel && (
          <form onSubmit={sendMessage} className="p-4 border-t bg-white">
            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message #${activeChannel.name}`}
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !socketRef.current?.connected}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
              {!socketRef.current?.connected && (
                <p className="text-red-500 text-sm">
                  Disconnected from server. Reconnecting...
                </p>
              )}
            </div>
          </form>
        )}
      </div>

      {showChannelModal && (
        <CreateChannelModal
          isOpen={showChannelModal}
          onClose={() => setShowChannelModal(false)}
          onSubmit={handleCreateChannel}
        />
      )}
    </div>
  );
};

export default App;