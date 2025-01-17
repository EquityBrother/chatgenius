import React, { useState } from 'react';
import { Bot, X } from 'lucide-react';

const BotPersona = ({ user, onClose }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoReply, setAutoReply] = useState("I'm currently away but will respond when I return.");

  const handleSave = () => {
    // We'll implement this later
    console.log('Saving bot configuration:', { isEnabled, autoReply });
    onClose();
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold">AI Persona</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Enable Auto-Reply</label>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="rounded border-gray-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Auto-Reply Message
          </label>
          <textarea
            value={autoReply}
            onChange={(e) => setAutoReply(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotPersona;