// services/rag-service.js

class RAGService {
    constructor() {
        this.baseUrl = 'http://localhost:8000/api';
        this.initialized = false;
        this.isAvailable = false;
    }

    async initialize() {
        try {
            // Test connection with heartbeat
            const response = await fetch(`${this.baseUrl}/heartbeat`);
            if (!response.ok) {
                throw new Error('ChromaDB server not responding');
            }

            // Don't check collections, just mark as initialized if heartbeat succeeds
            this.initialized = true;
            this.isAvailable = true;
            console.log('RAG Service initialized successfully');
        } catch (error) {
            console.warn('RAG Service unavailable:', error.message);
            this.isAvailable = false;
        }
    }

    async addMessage(message) {
        if (!this.isAvailable) return;

        try {
            const response = await fetch(`${this.baseUrl}/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: message.id,
                    content: message.content,
                    metadata: {
                        sender: message.sender.name,
                        timestamp: message.timestamp
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to add message to ChromaDB');
            }

            const result = await response.json();
            if (result.status === 'success') {
                console.log('Successfully added message to RAG service');
            }
        } catch (error) {
            console.warn('Failed to add message to RAG service:', error.message);
        }
    }

    async searchMessages(query) {
        if (!this.isAvailable) return [];

        try {
            const response = await fetch(
                `${this.baseUrl}/search?query=${encodeURIComponent(query)}&n_results=5`
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Search request failed');
            }

            const data = await response.json();
            return data.results?.documents?.[0] || [];
        } catch (error) {
            console.warn('Error searching messages:', error.message);
            return [];
        }
    }

    async generateAIResponse(query, relevantMessages) {
        if (!this.isAvailable) {
            return {
                content: "I'm currently operating in basic mode without access to message history. How can I help you?",
                timestamp: new Date().toISOString()
            };
        }

        return {
            content: `I found ${relevantMessages.length} relevant messages from our chat history that might help answer your question.`,
            timestamp: new Date().toISOString()
        };
    }
}

// Create and export a singleton instance
const ragService = new RAGService();
export default ragService;