import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Create session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
});

// Configure CORS for REST endpoints
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));

// Use session middleware
app.use(sessionMiddleware);

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

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

app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

app.post('/auth/guest', express.json(), (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const guestUser = {
    id: `guest_${Date.now()}`,
    name: name,
    isGuest: true
  };

  req.session.passport = {
    user: guestUser
  };

  req.session.save((err) => {
    if (err) {
      console.error('Error saving session:', err);
      return res.status(500).json({ error: 'Error logging in as guest' });
    }
    res.json({ user: guestUser });
  });
});

// Channel and Message Storage
const channels = new Map([
  ['general', {
    id: 'general',
    name: 'general',
    description: 'General discussion',
    isPrivate: false,
    members: new Set(),
    createdAt: new Date().toISOString(),
  }]
]);

// Setup Socket.IO with CORS and session handling
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Wrap socket.io with session middleware
io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res, next);
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Get user from session
  const user = socket.request.session?.passport?.user;
  console.log('Connected user:', user);

  if (user) {
    // Add user to connected users
    connectedUsers.set(socket.id, user);
    
    // Join general channel by default
    socket.join('general');
    
    // Notify others of new user
    io.emit('userJoined', {
      user,
      onlineUsers: Array.from(connectedUsers.values())
    });

    // Handle messages
    socket.on('message', (messageData) => {
      console.log('Received message:', messageData);
      
      const messageWithId = {
        ...messageData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };
      
      // Store message
      if (!messages[messageData.channelId]) {
        messages[messageData.channelId] = [];
      }
      messages[messageData.channelId].push(messageWithId);
      
      // Broadcast to everyone including sender
      io.emit('message', messageWithId);
    });

    // Handle channel joining
    socket.on('join-channel', ({ channelId }) => {
      console.log(`User ${user.name} joining channel:`, channelId);
      socket.join(channelId);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      connectedUsers.delete(socket.id);
      io.emit('userLeft', {
        user,
        onlineUsers: Array.from(connectedUsers.values())
      });
    });
  }
});

// Remove or comment out the existing WebSocket (wss) implementation
// wss.on('connection', ...) and related functions can be removed

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});