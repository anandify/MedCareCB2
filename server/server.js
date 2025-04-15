import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server'
import fs from 'fs';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import fileUpload from 'express-fileupload';
import path from 'path'; 

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY);

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

app.use(fileUpload({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max file size
  abortOnLimit: true,
  useTempFiles: false // Recommended to manage temp files explicitly like you are
}));

// JWT Generation (ensure JWT_SECRET is set in .env)
function generateJwtToken(user) {
  const payload = {
    id: user.id,
    name: user.displayName,
    email: user.emails[0].value
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-very-secret-key-here', { expiresIn: '1h' }); // Use environment variable!
}

// Setup session middleware (ensure SESSION_SECRET is set in .env)
app.use(session({
  secret: process.env.SESSION_SECRET || 'another-very-secret-key-here', // Use environment variable!
  resave: false,
  saveUninitialized: false,
  cookie: { // Add cookie configuration for security, especially if using HTTPS
     secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
     httpOnly: true,
     sameSite: 'lax' // Or 'strict' or 'none' depending on cross-site needs
   }
}));

app.use(passport.initialize());
app.use(passport.session());

// In-memory conversation store (Consider a database for production)
const conversations = {};

// Passport setup for Google OAuth (ensure IDs/Secrets are in .env)
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback' // Ensure this matches Google Cloud Console setup
}, (accessToken, refreshToken, profile, cb) => {
  // In a real app, you'd find or create a user in your database here
  cb(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user); // Storing the whole profile in session, consider storing only user ID
});

passport.deserializeUser((user, done) => {
  // In a real app, you'd fetch the user from your database using the ID stored in the session
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
    // These fields usually aren't available directly from basic Google OAuth scope
    age: user.age || null,
    bloodGroup: user.bloodGroup || null,
  };

  // Redirect back to frontend with token and user data
  const redirectURL = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${redirectURL}?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`);
});

// --- Conversation Loading/Saving ---

const CONVERSATIONS_DIR = './conversations';

// Helper function to load conversation history
const loadConversationFromFile = (username, conversationId) => {
  const filePath = path.join(CONVERSATIONS_DIR, username, `conversation_${conversationId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading conversation ${conversationId} for ${username}:`, error);
  }
  return null; // Return null if file doesn't exist or error occurs
};

// Function to save conversation history
const saveConversationToFile = (username, conversationId, history) => {
  try {
    const dirPath = path.join(CONVERSATIONS_DIR, username);
    const filePath = path.join(dirPath, `conversation_${conversationId}.json`);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), { flag: 'w' });
    // console.log(`Conversation ${conversationId} for ${username} saved.`);
  } catch (error) {
    console.error(`Error saving conversation ${conversationId} for ${username}:`, error);
  }
};

// --- Core Chat Handling ---

// Function to format history for the Gemini API
const formatHistoryForAPI = (history) => {
  return history.map(entry => {
    const parts = [];
    // IMPORTANT: Ensure 'text' is always a string, even if empty
    parts.push({ text: entry.text || "" });

    // Add fileData part ONLY if fileUri and fileMimeType exist for that entry
    if (entry.fileUri && entry.fileMimeType) {
      parts.push({
        fileData: {
          mimeType: entry.fileMimeType,
          fileUri: entry.fileUri
        }
      });
    }
    return {
      role: entry.role,
      parts: parts
    };
  });
};


// Middleware to handle chat requests
const handleRequest = async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    let { conversationId, prompt, fileUri, fileMimeType } = req.body; // *** URI/MIME must come from client ***
    let username = req.isAuthenticated() ? req.user.emails[0].value : 'non_logged'; // Use email as identifier

    // Validate prompt
    if (typeof prompt !== 'string') {
        return res.status(400).send({ error: 'Invalid prompt provided.' });
    }

    if (!conversationId) {
      conversationId = uuidv4();
      console.log(`Starting new conversation ${conversationId} for ${username}`);
    }

    // --- Manage Conversation State ---
    if (!conversations[username]) {
      conversations[username] = {};
    }

    let currentConversation = conversations[username][conversationId];

    if (!currentConversation) {
        // Try loading from file if not in memory
        const storedHistory = loadConversationFromFile(username, conversationId);
        if (storedHistory) {
            console.log(`Loaded conversation ${conversationId} from file for ${username}`);
            currentConversation = { history: storedHistory };
        } else {
            console.log(`Creating new in-memory conversation ${conversationId} for ${username}`);
            currentConversation = { history: [] };
        }
        conversations[username][conversationId] = currentConversation;
    }

    let history = currentConversation.history;

    // --- Prepare message for Gemini ---

    // 1. Create the user message entry for history storage
    const userHistoryEntry = {
      role: 'user',
      text: prompt
    };
    // Add file info to history entry IF PROVIDED IN THIS REQUEST
    if (fileUri && fileMimeType) {
      console.log(`Received file reference in chat request: URI=${fileUri}, Type=${fileMimeType}`);
      userHistoryEntry.fileUri = fileUri;
      userHistoryEntry.fileMimeType = fileMimeType;
    } else {
       console.log("No file reference received in this chat request.");
    }
    history.push(userHistoryEntry); // Add to history *before* sending

    // 2. Format the history *including the new user message* for the API call
    //    (Gemini processes history + new message together)
    //    We format just before the call to ensure consistency.
    const apiHistory = formatHistoryForAPI(history.slice(0, -1)); // History *before* the current message

    // 3. Prepare the *current* message parts for sendMessage
    const currentMessageParts = [];
    // Always include a text part, even if the prompt is empty
    currentMessageParts.push({ text: prompt || "" });

    // Add fileData part to the *current message* if provided in the request
    if (fileUri && fileMimeType) {
       // *** THIS IS THE CRITICAL PART ***
       // The fileUri received here MUST be the one returned by fileManager.uploadFile
       currentMessageParts.push({
         fileData: {
           mimeType: fileMimeType,
           fileUri: fileUri // Ensure this is the correct URI string
         }
       });
    }


    // --- Start Chat & Send Message ---
    //    Always start a new chat session with the relevant history.
    //    This ensures the API gets the correct context, especially with files.
    const chat = model.startChat({
        history: apiHistory, // Send history *before* the current message
        generationConfig: { maxOutputTokens: 8192 } // Increased tokens for potentially larger responses
    });

    // console.log("Sending message to Gemini. Parts:", JSON.stringify(currentMessageParts, null, 2));
    // console.log("Sending message with history:", JSON.stringify(apiHistory, null, 2));


    // *** Sending the message to the API ***
    const result = await chat.sendMessage(currentMessageParts); // Send only the *new* message parts
    const response = await result.response;
    const botResponseText = response.text();

    // --- Update History & Save ---
    history.push({ role: 'model', text: botResponseText });

    // No need to update the 'chat' object in conversations store as we recreate it each time
    // conversations[username][conversationId].chat = chat; // Remove this line

    saveConversationToFile(username, conversationId, history);

    res.status(200).send({ bot: botResponseText, conversationId: conversationId }); // Send back conversationId

  } catch (error) {
    console.error("Error in '/' handler:", error);
    // Provide more specific error info if available
    if (error.response && error.response.data) {
        console.error("API Error Data:", error.response.data);
        res.status(500).send({ error: `API Error: ${error.message}`, details: error.response.data });
    } else if (error.message) {
        res.status(500).send({ error: error.message });
    } else {
        res.status(500).send({ error: 'An unknown error occurred' });
    }
  }
};

// --- File Upload Endpoint ---
app.post('/upload-file', async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.file) {
      // Changed: It's better to return an error if no file is sent to an upload endpoint
      return res.status(400).json({ success: false, error: 'No file was uploaded.' });
    }

    const uploadedFile = req.files.file;
    // You might want conversationId here too if uploads are tied to specific chats contextually,
    // but the core issue is referencing it *later*.
    // const { conversationId } = req.body;
    // const username = req.isAuthenticated() ? req.user.emails[0].value : 'non_logged';

    // Create temp directory if it doesn't exist
    const TEMP_DIR = './temp';
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Save file temporarily to disk
    const tempFilePath = path.join(TEMP_DIR, `${Date.now()}_${uploadedFile.name}`);

    // Use await with the promise-based writeFile
    await fs.promises.writeFile(tempFilePath, uploadedFile.data);
    console.log(`Temporary file saved to ${tempFilePath}`);

    try {
      // Upload file using FileManager
      console.log(`Uploading ${uploadedFile.name} (${uploadedFile.mimetype}) to Gemini...`);
      const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: uploadedFile.mimetype,
        displayName: uploadedFile.name // Optional: provide a display name
      });

      // *** Extract the URI ***
      const fileUri = uploadResult.file.uri;
      console.log(`File uploaded successfully. URI: ${fileUri}`);

      // --- CRITICAL ---
      // Send the URI and MIME type back to the CLIENT.
      // The client MUST store these and send them with the *next* chat message
      // that needs to reference this file.
      res.status(200).json({
        success: true,
        filename: uploadedFile.name,
        fileUri: fileUri, // Send this back
        mimeType: uploadedFile.mimetype // Send this back
      });

    } catch (uploadError) {
        console.error('Error uploading file to Gemini API:', uploadError);
        res.status(500).json({ success: false, error: `Failed to upload file to Gemini: ${uploadError.message}` });
    } finally {
      // Clean up the temporary file
      try {
        await fs.promises.unlink(tempFilePath);
        console.log(`Temporary file ${tempFilePath} deleted.`);
      } catch (unlinkError) {
        // Log error but don't fail the request if cleanup fails
        console.error('Error deleting temporary file:', unlinkError);
      }
    }
  } catch (error) {
    console.error('Error in /upload-file handler:', error);
    res.status(500).json({ success: false, error: error.message || 'An unknown file upload error occurred' });
  }
});
// --- List Files Endpoint ---
app.get('/list-files', async (req, res) => {
  try {
    const result = await fileManager.listFiles({ pageSize: 50 }); // result is an object
    const files = result.files || []; // safely get the array
    console.log('Raw files response:', files);

    const fileDetails = files.map(file => ({
      name: file.displayName || 'Unnamed File',
      uri: file.uri,
      mimeType: file.mimeType,
    }));

    res.status(200).json({ success: true, files: fileDetails });
  } catch (error) {
    console.error('Error fetching file list:', error);
    res.status(500).send({ success: false, error: 'Failed to fetch file list' });
  }
});



// --- Register Main Chat Route ---
app.post('/', handleRequest);

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
