import React, { useState } from 'react';
import { MessageCircle, Hash, Plus, ChevronDown, ChevronRight } from 'lucide-react';

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
    const [showNewChannelModal, setShowNewChannelModal] = useState(false);
    const [showNewDMModal, setShowNewDMModal] = useState(false);
    
    return (
      <div className="w-64 bg-gray-800 text-gray-300 flex flex-col h-full">
        {/* Workspace Header */}
        <div className="px-4 py-3 border-b border-gray-700">
          <h1 className="text-white font-bold text-xl">ChatGenius</h1>
        </div>
        
        {/* Channels Section */}
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
                  setShowNewChannelModal(true);
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
  
          {/* Direct Messages Section */}
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
                  setShowNewDMModal(true);
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
                    {dm.unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {dm.unreadCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  export default ChannelSidebar;