import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
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

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB Schema Definitions
const UserSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  avatar: String,
  isGoogle: Boolean,
  isGuest: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  id: String,
  content: String,
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  reactions: {},
  thread: {
    replies: [{
      content: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      timestamp: { type: Date, default: Date.now }
    }],
    replyCount: { type: Number, default: 0 }
  },
  file: {
    id: String,
    name: String,
    path: String,
    type: String,
    size: Number,
    uploadedBy: String,
    url: String
  }
});

const DirectMessageSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{
    content: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }]
});

const FileSchema = new mongoose.Schema({
  id: String,
  name: String,
  path: String,
  type: String,
  size: Number,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  url: String
});

// Create MongoDB models
const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);
const DirectMessage = mongoose.model('DirectMessage', DirectMessageSchema);
const File = mongoose.model('File', FileSchema);

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Session configuration with MongoDB store
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
});

// Configure Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  },
  maxHttpBufferSize: 10e6
});

// Configure CORS for REST endpoints
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(sessionMiddleware);
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());
app.use('/uploads', express.static(uploadsDir));

// Passport configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
      let user = await User.findOne({ id: profile.id });
      
      if (!user) {
        user = await User.create({
          id: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
          isGoogle: true
        });
      }
      
      return cb(null, user);
    } catch (error) {
      return cb(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findOne({ id });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Socket.IO Middleware
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.use((socket, next) => {
  if (socket.request.session?.passport?.user) {
    next();
  } else {
    next(new Error('Unauthorized'));
  }
});

// Socket connection handling
const connectedUsers = new Map();

io.on('connection', async (socket) => {
  const userId = socket.request.session.passport.user;
  const user = await User.findOne({ id: userId });
  
  console.log('New client connected:', socket.id);

  // Send existing messages
  const messages = await Message.find()
    .populate('sender')
    .sort({ timestamp: -1 })
    .limit(100);
  socket.emit('initialize-messages', messages.reverse());

  // Handle user connection
  connectedUsers.set(socket.id, user);
  io.emit('userJoined', {
    user,
    onlineUsers: Array.from(connectedUsers.values())
  });

  // Handle messages
  socket.on('message', async (messageData) => {
    try {
      const newMessage = await Message.create({
        id: uuidv4(),
        content: messageData.content,
        sender: user._id,
        timestamp: new Date(),
        file: messageData.file
      });

      const populatedMessage = await newMessage.populate('sender');
      io.emit('message', populatedMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // Handle file uploads
  socket.on('file-upload', async ({ fileData, file }) => {
    try {
      const fileId = uuidv4();
      const fileName = `${fileId}-${fileData.name}`;
      const filePath = path.join(uploadsDir, fileName);
      
      const base64Data = file.split(';base64,').pop();
      fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
      
      const savedFile = await File.create({
        id: fileId,
        name: fileData.name,
        path: fileName,
        type: fileData.type,
        size: fileData.size,
        uploadedBy: user._id,
        url: `/uploads/${fileName}`
      });

      socket.emit('file-upload-complete', savedFile);
    } catch (error) {
      console.error('File upload error:', error);
      socket.emit('file-upload-error', { error: 'Failed to upload file' });
    }
  });

  // Handle direct messages
  socket.on('direct-message', async (messageData) => {
    try {
      const { from, to, content } = messageData;
      let dm = await DirectMessage.findOne({
        participants: { $all: [from, to] }
      });

      if (!dm) {
        dm = await DirectMessage.create({
          participants: [from, to],
          messages: []
        });
      }

      dm.messages.push({
        content,
        sender: user._id,
        timestamp: new Date()
      });

      await dm.save();

      const recipientSocket = Array.from(connectedUsers.entries())
        .find(([_, u]) => u.id === to)?.[0];
        
      if (recipientSocket) {
        io.to(recipientSocket).emit('direct-message', messageData);
      }
      
      socket.emit('direct-message', messageData);
    } catch (error) {
      console.error('Error handling direct message:', error);
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

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});