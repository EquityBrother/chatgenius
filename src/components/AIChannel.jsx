import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send } from 'lucide-react';

const AIChannel = ({ user, socketRef }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on('ai-response', (response) => {
      setMessages(prev => [...prev, {
        type: 'ai',
        content: response.content,
        timestamp: new Date().toISOString()
      }]);
      setIsLoading(false);
    });

    return () => {
      socketRef.current.off('ai-response');
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current?.connected) return;

    const userMessage = {
      type: 'user',
      content: input,
      sender: user,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    socketRef.current.emit('ai-message', {
      content: input,
      userId: user.id
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="border-b px-4 py-3 flex items-center">
        <Bot className="w-6 h-6 text-blue-500 mr-2" />
        <h2 className="text-lg font-semibold">AI Assistant</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-blue-50 rounded-lg p-4 text-sm">
          👋 Hi! I'm your AI assistant. I can help answer questions about chat history and provide general assistance.
        </div>

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                {message.type === 'user' ? (
                  <>
                    <span className="text-sm font-semibold">You</span>
                    {message.sender?.avatar && (
                      <img 
                        src={message.sender.avatar} 
                        alt="Avatar" 
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Bot className="w-5 h-5" />
                    <span className="text-sm font-semibold">AI Assistant</span>
                  </>
                )}
              </div>
              <div>{message.content}</div>
              <div className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50 flex items-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChannel;