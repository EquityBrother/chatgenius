import React, { useState } from 'react';
import { MessageCircle, Hash, Plus, ChevronDown, ChevronRight, Bot } from 'lucide-react';

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
        <div className="w-64 bg-gray-800 text-white flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <h1 className="text-xl font-bold">ChatGenius</h1>
                <p className="text-sm text-gray-400">AI-Enhanced Chat</p>
            </div>

            {/* Main Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
                    {/* AI Assistant Button */}
                    <div
                        className={`flex items-center space-x-2 px-2 py-2 rounded cursor-pointer ${
                            activeChannel?.id === 'ai-assistant'
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-gray-700'
                        }`}
                        onClick={() => onChannelSelect({ id: 'ai-assistant', name: 'AI Assistant' })}
                    >
                        <Bot size={20} />
                        <span className="font-medium">AI Assistant</span>
                    </div>

                    {/* Channels Section */}
                    <div>
                        <div 
                            className="flex items-center justify-between py-2 cursor-pointer group"
                            onClick={() => setShowChannels(!showChannels)}
                        >
                            <div className="flex items-center space-x-1">
                                {showChannels ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <span className="text-sm font-medium text-gray-300">Channels</span>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCreateChannel?.();
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:text-white text-gray-400"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {showChannels && (
                            <div className="space-y-1 ml-2">
                                {channels.map(channel => (
                                    <div
                                        key={channel.id}
                                        className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer ${
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
                    <div>
                        <div 
                            className="flex items-center justify-between py-2 cursor-pointer group"
                            onClick={() => setShowDMs(!showDMs)}
                        >
                            <div className="flex items-center space-x-1">
                                {showDMs ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <span className="text-sm font-medium text-gray-300">Direct Messages</span>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCreateDM?.();
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:text-white text-gray-400"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {showDMs && (
                            <div className="space-y-1 ml-2">
                                {directMessages.map(dm => (
                                    <div
                                        key={dm.id}
                                        className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer ${
                                            activeChannel?.id === dm.id
                                                ? 'bg-blue-600 text-white'
                                                : 'hover:bg-gray-700'
                                        }`}
                                        onClick={() => onChannelSelect(dm)}
                                    >
                                        <MessageCircle size={16} />
                                        <span className="text-sm">{
                                            dm.participants
                                                ?.filter(p => p.id !== currentUser?.id)
                                                .map(p => p.name)
                                                .join(', ') || dm.name
                                        }</span>
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

            {/* User Profile */}
            <div className="p-4 border-t border-gray-700">
                <div className="flex items-center space-x-2">
                    {currentUser?.avatar && (
                        <img 
                            src={currentUser.avatar} 
                            alt="Profile" 
                            className="w-8 h-8 rounded-full"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {currentUser?.name}
                        </p>
                        <p className="text-xs text-gray-400">
                            {currentUser?.isGuest ? 'Guest' : 'Member'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChannelSidebar;