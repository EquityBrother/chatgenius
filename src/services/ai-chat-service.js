// src/services/ai-chat-service.js
import OpenAI from 'openai';

// Get OpenAI API key from environment variable
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const CHROMA_API_URL = 'http://localhost:8000';

const SYSTEM_PROMPT = `You are a helpful AI assistant in a chat application. You have access to the chat history and can reference past conversations to provide context-aware responses. Always be friendly and conversational in your tone.

When referencing past messages, you can quote them directly and cite who said them. 

Some guidelines:
- Be concise but informative
- Use a natural, conversational tone
- Reference relevant past messages when appropriate
- Ask clarifying questions if needed
- Be honest if you're unsure about something`;

class AIChatService {
  constructor() {
    if (!OPENAI_API_KEY) {
      console.warn('OpenAI API key not found in environment variables');
    }
    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Required for client-side usage
    });
  }

  async searchChatHistory(query, limit = 5) {
    try {
      const response = await fetch(`${CHROMA_API_URL}/api/search?query=${encodeURIComponent(query)}&n_results=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to search chat history');
      }
      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Error searching chat history:', error);
      return [];
    }
  }

  async addMessageToHistory(message) {
    try {
      const response = await fetch(`${CHROMA_API_URL}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: message.id,
          content: message.content,
          metadata: {
            sender: message.sender.name,
            timestamp: message.timestamp,
            messageType: 'chat'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add message to history');
      }
    } catch (error) {
      console.error('Error adding message to history:', error);
    }
  }

  formatRelevantHistory(results) {
    if (!results || !results.documents || !results.metadatas) {
      return '';
    }

    return results.documents[0].map((doc, index) => {
      const metadata = results.metadatas[0][index];
      return `[${metadata.sender} at ${new Date(metadata.timestamp).toLocaleString()}]: ${doc}`;
    }).join('\n');
  }

  async generateResponse(userMessage, userId) {
    try {
      if (!this.openai) {
        console.error('OpenAI client not initialized');
        return {
          content: "I'm not properly configured yet. Please make sure the OpenAI API key is set.",
          timestamp: new Date().toISOString()
        };
      }
      
      console.log('Generating response for message:', userMessage);
      

      // Search for relevant message history
      console.log('Searching chat history...');
      const relevantHistory = await this.searchChatHistory(userMessage);
      console.log('Found relevant history:', relevantHistory);
      const formattedHistory = this.formatRelevantHistory(relevantHistory);
      console.log('Formatted history:', formattedHistory);

      // Construct messages array for ChatGPT
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
      ];

      // Add relevant history if available
      if (formattedHistory) {
        messages.push({
          role: 'system',
          content: `Here are some relevant messages from the chat history:\n${formattedHistory}`
        });
      }

      // Add the user's current message
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Generate response using ChatGPT
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 500
      });

      const response = completion.choices[0].message.content;

      // Store the AI's response in ChromaDB as well
      await this.addMessageToHistory({
        id: `ai-${Date.now()}`,
        content: response,
        sender: { name: 'AI Assistant' },
        timestamp: new Date().toISOString()
      });

      return {
        content: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export a singleton instance
export default new AIChatService();