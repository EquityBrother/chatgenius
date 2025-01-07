import React, { useState, useRef, useEffect } from 'react';

const DirectMessagePanel = ({ user, onlineUsers, socketRef, onClose }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socketRef.current) return;

    // Listen for DM messages
    socketRef.current.on('direct-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Get DM history when selecting a user
    socketRef.current.on('dm-history', ({ messages: dmMessages }) => {
      setMessages(dmMessages);
    });

    return () => {
      socketRef.current?.off('direct-message');
      socketRef.current?.off('dm-history');
    };
  }, []);

  useEffect(() => {
    if (selectedUser) {
      socketRef.current?.emit('get-dm-history', {
        from: user.id,
        to: selectedUser.id
      });
    }
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socketRef.current?.connected && selectedUser) {
      const messageData = {
        content: newMessage,
        from: user.id,
        to: selectedUser.id,
        sender: user,
        timestamp: new Date().toISOString()
      };
      
      socketRef.current.emit('direct-message', messageData);
      setNewMessage('');
    }
  };

  // Filter out current user from online users list
  const availableUsers = onlineUsers.filter(u => u.id !== user.id);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="font-semibold text-lg">Direct Messages</h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="flex h-full">
        {/* Users List */}
        <div className="w-64 border-r overflow-y-auto">
          {availableUsers.map(onlineUser => (
            <div
              key={onlineUser.id}
              onClick={() => setSelectedUser(onlineUser)}
              className={`p-3 flex items-center space-x-3 cursor-pointer hover:bg-gray-100
                ${selectedUser?.id === onlineUser.id ? 'bg-gray-100' : ''}`}
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="flex-1 truncate">
                {onlineUser.name}
              </div>
            </div>
          ))}
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              <div className="p-4 border-b">
                <h3 className="font-medium">
                  Chat with {selectedUser.name}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender.id === user.id 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100'
                    }`}>
                      <div>{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${selectedUser.name}`}
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a user to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectMessagePanel;