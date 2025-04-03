import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: 'You are a chatbot that helps pregnant women. (The woman is already pregnant so please don’t ask unnecessary questions).',
});

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://mamta-blond.vercel.app'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true
}));

app.use(express.json());

function generateJwtToken(user) {
  const payload = {
    id: user.id,
    name: user.displayName,
    email: user.emails[0].value
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
}

// Setup session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const conversations = {};

// Passport setup for Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, cb) => {
  cb(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Routes for Google OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  const user = req.user;
  const token = generateJwtToken(user);
  const userData = {
    name: user.displayName,
    email: user.emails[0].value,
    picture: user.photos?.[0]?.value || '',
    age: user.age || null,
    bloodGroup: user.bloodGroup || null,
  };

  const redirectURL = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${redirectURL}?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`);
});

// Helper function to load conversation history
const loadConversationFromFile = (username, conversationId) => {
  const filePath = `./conversations/${username}/conversation_${conversationId}.json`;
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return null;
};

// Function to save conversation history
const saveConversationToFile = (username, conversationId, history) => {
  const dirPath = `./conversations/${username}`;
  const filePath = `${dirPath}/conversation_${conversationId}.json`;

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(history, null, 2), { flag: 'w' });
};

// Middleware to handle unauthenticated requests
const handleRequest = async (req, res) => {
  try {
    let { conversationId, prompt } = req.body;
    let username = req.isAuthenticated() ? req.user.emails[0].value : 'non_logged';

    if (!conversationId) {
      conversationId = uuidv4();
    }

    let chat;
    let history = [];

    if (conversations[username]?.[conversationId]) {
      chat = conversations[username][conversationId].chat;
      history = conversations[username][conversationId].history;
    } else {
      const storedHistory = loadConversationFromFile(username, conversationId);
      if (storedHistory) {
        history = storedHistory;
      }

      chat = model.startChat({
        history: history.map(entry => ({
          role: entry.role,
          parts: [{ text: entry.text }]
        })),
        generationConfig: { maxOutputTokens: 1000 }
      });

      if (!conversations[username]) {
        conversations[username] = {};
      }

      conversations[username][conversationId] = { chat, history: [...history] };
    }

    conversations[username][conversationId].history.push({ role: 'user', text: prompt });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const botResponse = response.text();

    conversations[username][conversationId].history.push({ role: 'model', text: botResponse });

    // Save conversation history
    saveConversationToFile(username, conversationId, conversations[username][conversationId].history);

    res.status(200).send({ bot: botResponse });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message || 'Error');
  }
};


app.post('/', handleRequest);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
