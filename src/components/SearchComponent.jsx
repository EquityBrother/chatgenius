import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, File, X } from 'lucide-react';
import { debounce } from 'lodash';

const SearchComponent = ({ socketRef, onResultClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' or 'files'

  const performSearch = debounce((term) => {
    if (!term.trim() || !socketRef.current) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    socketRef.current.emit('search', {
      term,
      type: activeTab
    });
  }, 300);

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on('search-results', (results) => {
      setSearchResults(results);
      setIsSearching(false);
    });

    return () => {
      socketRef.current.off('search-results');
    };
  }, []);

  useEffect(() => {
    performSearch(searchTerm);
  }, [searchTerm, activeTab]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowResults(!!value.trim());
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="relative">
      <div className="w-full">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search messages and files..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border max-h-96 overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'messages'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Messages
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'files'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Files
            </button>
          </div>

          <div className="overflow-y-auto max-h-80">
            {isSearching ? (
              <div className="p-4 text-center text-gray-500">
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No results found
              </div>
            ) : (
              <div className="divide-y">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => {
                      onResultClick(result);
                      setShowResults(false);
                      setSearchTerm('');
                    }}
                    className="p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-start space-x-3">
                      {activeTab === 'messages' ? (
                        <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
                      ) : (
                        <File className="w-5 h-5 text-gray-400 mt-1" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {result.sender?.name || result.uploadedBy}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(result.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 truncate">
                          {activeTab === 'messages' ? result.content : result.name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;