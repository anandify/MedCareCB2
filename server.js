import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: 'You are a chatbot that helps pregnant women. (The woman is already pregnant so please don’t ask unnecessary questions).',
});

const app = express();
app.use(cors());
app.use(express.json());

const conversations = {};

// Helper function to load conversation history from file
const loadConversationFromFile = (conversationId) => {
  const filePath = `./conversations/conversation_${conversationId}.json`;
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
  return null;
};

// Function to save conversation history to a JSON file
const saveConversationToFile = (conversationId, history) => {
  const filePath = `./conversations/conversation_${conversationId}.json`;

  // Ensure the conversations folder exists
  if (!fs.existsSync('./conversations')) {
    fs.mkdirSync('./conversations');
  }

  fs.writeFileSync(filePath, JSON.stringify(history, null, 2), { flag: 'w' });
};

app.get('/', (req, res) => {
  res.status(200).send({
    message: 'Hi!, I am Mamta, a chatbot that helps you in your pregnancy.',
  });
});

app.post('/', async (req, res) => {
  try {
    const { conversationId, prompt } = req.body;

    let chat;
    let history = [];
    
    // Check if the conversation is in memory
    if (conversationId && conversations[conversationId]) {
      chat = conversations[conversationId].chat;
      history = conversations[conversationId].history;
    } else {
      // Check if the conversation is stored on the filesystem
      const storedHistory = loadConversationFromFile(conversationId);
      if (storedHistory) {
        history = storedHistory;
      }

      // If no chat session exists, start a new one
      chat = model.startChat({
        history: history.map(entry => ({
          role: entry.role,
          parts: [{ text: entry.text }]
        })),
        generationConfig: {
          maxOutputTokens: 100,
        },
      });

      conversations[conversationId] = {
        chat,
        history: [...history], // Copy existing history or start fresh
      };
    }

    // Append the new user input to the history
    conversations[conversationId].history.push({ role: 'user', text: prompt });

    // Send the new prompt to the chatbot
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const botResponse = response.text();

    // Append the bot's response to the history
    conversations[conversationId].history.push({ role: 'model', text: botResponse });

    // Save the updated history to the file system
    saveConversationToFile(conversationId, conversations[conversationId].history);

    // Send response back to the client
    res.status(200).send({
      bot: botResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error || 'Error');
  }
});

app.listen(5000, () => console.log('Server started on http://localhost:5000'));
