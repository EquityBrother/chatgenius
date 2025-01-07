import React, { useState } from 'react';
import { X } from 'lucide-react';

const CreateChannelModal = ({ isOpen, onClose, onCreateChannel }) => {
    const [channelName, setChannelName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [description, setDescription] = useState('');
  
    if (!isOpen) return null;
  
    const handleSubmit = (e) => {
      e.preventDefault();
      onCreateChannel({
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-md">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-bold">Create a Channel</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
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
  
  export default CreateChannelModal;