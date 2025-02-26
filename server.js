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
  systemInstruction: 'You are a chatbot that helps pregnant women. (The woman is already pregnant so please don’t ask unnecessary questions).Your name is Mamta.Do not utter your name unless asked to',
});

const app = express();
app.use(cors());
app.use(express.json());


// Function to generate JWT token
function generateJwtToken(user) {
  const payload = {
    id: user.id, 
    name: user.displayName, 
    email: user.emails[0].value
  };
  // Sign the token with a secret and set an expiration time (1 hour in this case)
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
}

// Setup session middleware
app.use(session({
  secret: 'your-secret-key',
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
  cb(null, profile); // profile contains user info
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Routes for Google OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// OAuth callback route on the server
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  // Assuming user info is stored in req.user after successful authentication
  const user = req.user;

  // Generate a token or extract user info
  const token = generateJwtToken(user); // Example function to generate a JWT token
  const userData = {
    name: user.name,
    email: user.email,
    picture: user.picture,
    age: user.age || null,
    bloodGroup: user.bloodGroup || null,
  };

  // Redirect to your client (Vite app) with token and user info as query params
  res.redirect(`http://localhost:5173?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`);
});


// Helper function to load conversation history from user-specific folder
const loadConversationFromFile = (username, conversationId) => {
  const filePath = `./conversations/${username}/conversation_${conversationId}.json`;
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
  return null;
};

// Function to save conversation history to a JSON file in user-specific folder
const saveConversationToFile = (username, conversationId, history) => {
  const dirPath = `./conversations/${username}`;
  const filePath = `${dirPath}/conversation_${conversationId}.json`;

  // Ensure the user's folder exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(history, null, 2), { flag: 'w' });
};

// Middleware to handle unauthenticated requests, allowing the API to function without login
const handleRequest = async (req, res) => {
  try {
    const { conversationId, prompt } = req.body;
    let username = req.isAuthenticated() ? req.user.emails[0].value : 'non_logged';

    let chat;
    let history = [];

    // Check if the conversation is in memory or stored in a file
    if (conversationId && conversations[username] && conversations[username][conversationId]) {
      chat = conversations[username][conversationId].chat;
      history = conversations[username][conversationId].history;
    } else {
      // Check if the conversation is stored in the user's folder or 'non_logged' folder
      const storedHistory = loadConversationFromFile(username, conversationId);
      if (storedHistory) {
        history = storedHistory;
      }

      // Start a new chat session if none exists
      chat = model.startChat({
        history: history.map(entry => ({
          role: entry.role,
          parts: [{ text: entry.text }]
        })),
        generationConfig: {
          maxOutputTokens: 100,
        },
      });

      if (!conversations[username]) {
        conversations[username] = {};
      }

      conversations[username][conversationId] = {
        chat,
        history: [...history],
      };
    }

    // Append the new user input to the history
    conversations[username][conversationId].history.push({ role: 'user', text: prompt });

    // Send the new prompt to the chatbot
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const botResponse = response.text();

    // Append the bot's response to the history
    conversations[username][conversationId].history.push({ role: 'model', text: botResponse });

    // Save the updated history to the user-specific or 'non_logged' folder
    saveConversationToFile(username, conversationId, conversations[username][conversationId].history);

    res.status(200).send({
      bot: botResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error || 'Error');
  }
};

// Route for starting or continuing a conversation
app.post('/', handleRequest);

app.listen(5000, () => console.log('Server started on http://localhost:5000'));
