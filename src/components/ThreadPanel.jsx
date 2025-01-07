import React, { useState } from 'react';

const ThreadView = ({ message = {}, onClose, user, socketRef }) => {
  const [reply, setReply] = useState('');
  const { sender = {}, content = '', timestamp = '', thread = { replies: [] } } = message;

  if (!message || !user || !socketRef) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading thread...</div>
      </div>
    );
  }

  const sendReply = (e) => {
    e.preventDefault();
    if (reply.trim() && socketRef.current?.connected) {
      socketRef.current.emit('thread-reply', {
        messageId: message.id,
        content: reply,
        sender: user,
        timestamp: new Date().toISOString()
      });
      setReply('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Thread</h3>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close thread"
        >
          ✕
        </button>
      </div>
      
      {/* Parent Message */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2 mb-2">
          {sender.avatar && (
            <img 
              src={sender.avatar} 
              alt="Avatar"
              className="w-6 h-6 rounded-full" 
            />
          )}
          <span className="font-semibold">
            {sender.name || 'Unknown User'}
          </span>
          <span className="text-sm text-gray-500">
            {timestamp ? new Date(timestamp).toLocaleString() : ''}
          </span>
        </div>
        <p>{content}</p>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {thread.replies.map((reply, index) => (
          <div 
            key={index}
            className={`flex ${reply.sender?.id === user.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-lg p-3 ${
              reply.sender?.id === user.id ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}>
              <div className="flex items-center space-x-2 mb-1">
                {reply.sender?.avatar && (
                  <img 
                    src={reply.sender.avatar} 
                    alt="Avatar" 
                    className="w-5 h-5 rounded-full"
                  />
                )}
                <span className="text-sm font-semibold">
                  {reply.sender?.id === user.id ? 'You' : reply.sender?.name || 'Unknown User'}
                </span>
              </div>
              <p>{reply.content}</p>
              <div className="text-xs opacity-70 mt-1">
                {reply.timestamp ? new Date(reply.timestamp).toLocaleTimeString() : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Input */}
      <form onSubmit={sendReply} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply to thread..."
            className="flex-1 px-3 py-2 border rounded-md"
            aria-label="Thread reply"
          />
          <button
            type="submit"
            disabled={!reply.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            Reply
          </button>
        </div>
      </form>
    </div>
  );
};

export default ThreadView;