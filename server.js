import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import ragService from './services/rag-service.js';
import OpenAI from 'openai';


const openai = new OpenAI({
  apiKey: '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'
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const aiConversations = new Map();

const app = express();
const httpServer = createServer(app);

// Data storage
const directMessages = new Map(); // Store DM history
const files = new Map(); // Store file metadata
const messageIndex = new Map(); // Search index for messages
const fileIndex = new Map(); // Search index for files
const messages = []; // Store messages

// Configure CORS for both Express and Socket.IO
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

// Create session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

// Configure Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["my-custom-header"]
  },
  maxHttpBufferSize: 10e6, // 10 MB max file size
  transports: ['websocket', 'polling']
});

// Configure CORS for REST endpoints
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

// Use session middleware
app.use(sessionMiddleware);
app.use(express.json());

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Initialize RAG service
(async () => {
  try {
    await ragService.initialize();
    console.log('RAG service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RAG service:', error);
    // Continue server startup even if RAG fails
  }
})();

// Passport configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    const user = {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0].value,
      isGoogle: true
    };
    return cb(null, user);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Auth Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: 'http://localhost:5173/login',
    successRedirect: 'http://localhost:5173'
  })
);

app.get('/auth/user', (req, res) => {
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Guest login route
app.post('/auth/guest', express.json(), (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const guestUser = {
    id: 'guest_' + Math.random().toString(36).substr(2, 9),
    name: name,
    isGuest: true
  };

  req.login(guestUser, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging in as guest' });
    }
    res.json({ user: guestUser });
  });
});

app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Search indexing functions
const addToMessageIndex = (message) => {
  const searchableText = `${message.content} ${message.sender.name}`.toLowerCase();
  messageIndex.set(message.id, {
    text: searchableText,
    message
  });
};

const addToFileIndex = (file) => {
  const searchableText = `${file.name} ${file.uploadedBy}`.toLowerCase();
  fileIndex.set(file.id, {
    text: searchableText,
    file
  });
};

const searchMessages = (term) => {
  const results = [];
  const searchTerm = term.toLowerCase();
  
  for (const [_, data] of messageIndex) {
    if (data.text.includes(searchTerm)) {
      results.push(data.message);
    }
  }
  
  return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const searchFiles = (term) => {
  const results = [];
  const searchTerm = term.toLowerCase();
  
  for (const [_, data] of fileIndex) {
    if (data.text.includes(searchTerm)) {
      results.push(data.file);
    }
  }
  
  return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};


// Socket.IO connection handling
const connectedUsers = new Map();

// Wrap the socket middleware to use session
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Socket authentication middleware
io.use((socket, next) => {
  if (socket.request.session && socket.request.session.passport) {
    next();
  } else {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  const user = socket.request.session.passport.user;
  aiConversations.set(socket.id, []);


  // Send existing messages to newly connected users
  socket.emit('initialize-messages', messages);

  // Join with authenticated user info
  connectedUsers.set(socket.id, user);
  io.emit('userJoined', {
    user,
    onlineUsers: Array.from(connectedUsers.values())
  });

  // Handle file uploads
  socket.on('file-upload', async ({ fileData, file }) => {
    try {
      const fileId = uuidv4();
      const base64Data = file.split(';base64,').pop();
      const fileName = `${fileId}-${fileData.name}`;
      const filePath = path.join(uploadsDir, fileName);
      
      fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
      
      const fileMetadata = {
        id: fileId,
        name: fileData.name,
        path: fileName,
        type: fileData.type,
        size: fileData.size,
        uploadedBy: fileData.uploadedBy,
        timestamp: fileData.timestamp,
        url: `/uploads/${fileName}`
      };
      
      files.set(fileId, fileMetadata);
      addToFileIndex(fileMetadata);

      socket.emit('file-upload-complete', fileMetadata);

      const fileMessage = {
        id: uuidv4(),
        content: `Shared a file: ${fileData.name}`,
        sender: user,
        timestamp: new Date().toISOString(),
        file: fileMetadata,
        reactions: {},
        thread: {
          replies: [],
          replyCount: 0
        }
      };

      messages.push(fileMessage);
      addToMessageIndex(fileMessage);
      io.emit('message', fileMessage);

    } catch (error) {
      console.error('File upload error:', error);
      socket.emit('file-upload-error', { error: 'Failed to upload file' });
    }
  });

  socket.on('ai-message', async ({ content, userId }) => {
    try {
      // Get or create the conversation for this socket
      const conversation = aiConversations.get(socket.id) || [];

      // Push the user's new question
      conversation.push({ role: 'user', content });

      // Define a system prompt to give the AI a persona
      const systemPrompt = {
        role: 'system',
        content: 'You are a helpful, friendly AI assistant.'
      };

      // Combine system + conversation so far
      const messagesForGPT = [systemPrompt, ...conversation];

      // Call GPT-4 (or GPT-3.5, etc.)
      const response = await openai.createChatCompletion({
        model: 'gpt-4',
        messages: messagesForGPT,
      });

      // Extract assistant message
      const assistantReply = response.data.choices[0].message?.content || '';

      // Append assistant reply to conversation
      conversation.push({ role: 'assistant', content: assistantReply });
      aiConversations.set(socket.id, conversation);

      // Send back to client
      socket.emit('ai-response', {
        content: assistantReply,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('OpenAI error:', error);
      socket.emit('ai-response', {
        content: "Sorry, I'm having trouble right now.",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle search requests
  socket.on('search', ({ term, type }) => {
    let results = [];
    
    if (type === 'messages') {
      results = searchMessages(term);
    } else if (type === 'files') {
      results = searchFiles(term);
    }
    
    socket.emit('search-results', results);
  });

  // Handle messages
  socket.on('message', async (messageData) => {
    try {
      const messageWithId = {
        ...messageData,
        id: uuidv4(),
        reactions: {},
        thread: {
          replies: [],
          replyCount: 0
        }
      };
      
      messages.push(messageWithId);
      addToMessageIndex(messageWithId);
      io.emit('message', messageWithId);

      // Try to add to RAG service, but don't block on it
      try {
        await ragService.addMessage(messageWithId);
      } catch (error) {
        console.error('Failed to add message to RAG service:', error);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  // Handle AI messages
  socket.on('ai-message', async ({ content, userId }) => {
    try {
      let relevantMessages = [];
      let aiResponse;

      try {
        // Only try to use RAG if it's initialized
        if (ragService.initialized) {
          relevantMessages = await ragService.searchMessages(content);
          aiResponse = await ragService.generateAIResponse(content, relevantMessages);
        } else {
          throw new Error('RAG service not initialized');
        }
      } catch (error) {
        console.error('RAG service error:', error);
        aiResponse = {
          content: "I apologize, but I'm having trouble accessing my knowledge base. Please try again later.",
          timestamp: new Date().toISOString()
        };
      }
      
      socket.emit('ai-response', aiResponse);
      
    } catch (error) {
      console.error('Error processing AI message:', error);
      socket.emit('ai-response', {
        content: "I apologize, but I encountered an error processing your request.",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle direct messages
  socket.on('direct-message', (messageData) => {
    const { from, to } = messageData;
    const dmKey = [from, to].sort().join(':');
    
    if (!directMessages.has(dmKey)) {
      directMessages.set(dmKey, []);
    }
    
    directMessages.get(dmKey).push(messageData);
    
    const recipientSocket = Array.from(connectedUsers.entries())
      .find(([_, user]) => user.id === to)?.[0];
      
    if (recipientSocket) {
      io.to(recipientSocket).emit('direct-message', messageData);
    }
    
    socket.emit('direct-message', messageData);
  });
  
  // Get DM history
  socket.on('get-dm-history', ({ from, to }) => {
    const dmKey = [from, to].sort().join(':');
    const history = directMessages.get(dmKey) || [];
    socket.emit('dm-history', { messages: history });
  });
  
  // Handle reactions
  socket.on('add-reaction', ({ messageId, reaction, userId }) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      if (!message.reactions[reaction]) {
        message.reactions[reaction] = new Set();
      }
      message.reactions[reaction].add(userId);
      
      const serializableReactions = {};
      for (const [emoji, users] of Object.entries(message.reactions)) {
        serializableReactions[emoji] = Array.from(users);
      }
      
      io.emit('reaction-updated', {
        messageId,
        reactions: serializableReactions
      });
    }
  });

  socket.on('remove-reaction', ({ messageId, reaction, userId }) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.reactions[reaction]) {
      message.reactions[reaction].delete(userId);
      
      if (message.reactions[reaction].size === 0) {
        delete message.reactions[reaction];
      }
      
      const serializableReactions = {};
      for (const [emoji, users] of Object.entries(message.reactions)) {
        serializableReactions[emoji] = Array.from(users);
      }
      
      io.emit('reaction-updated', {
        messageId,
        reactions: serializableReactions
      });
    }
  });

  // Handle threads
  socket.on('create-thread', ({ messageId, reply }) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      if (!message.thread) {
        message.thread = {
          replies: [],
          replyCount: 0
        };
      }
      message.thread.replies.push(reply);
      message.thread.replyCount++;
      io.emit('thread-updated', { messageId, thread: message.thread });
    }
  });

  socket.on('thread-reply', ({ messageId, content, sender, timestamp }) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.thread) {
      const reply = { content, sender, timestamp };
      message.thread.replies.push(reply);
      message.thread.replyCount++;
      io.emit('thread-updated', { messageId, thread: message.thread });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`User disconnected - Socket ID: ${socket.id}, User:`, user);
      connectedUsers.delete(socket.id);
      
      io.emit('userLeft', {
        user,
        onlineUsers: Array.from(connectedUsers.values())
      });
    }
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  httpServer.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server with error handling
const PORT = process.env.PORT || 3000;
const startServer = () => {
  try {
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO server is ready to accept connections`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();