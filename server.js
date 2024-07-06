import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

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

app.get('/', (req, res) => {
  res.status(200).send({
    message: 'Hi!, I am Mamta, a chatbot that helps you in your pregnancy.',
  });
});

app.post('/', async (req, res) => {
  try {
    const { conversationId, prompt } = req.body;

    let chat;
    if (conversationId && conversations[conversationId]) {
      chat = conversations[conversationId].chat;
    } else {
      chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 100,
        },
      });

      const newConversationId = uuidv4();
      conversations[newConversationId] = {
        chat,
        history: [
          { role: 'user', text: prompt },
        ],
      };

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const botResponse = response.text();

      conversations[newConversationId].history.push(
        { role: 'model', text: botResponse }
      );

      console.log(`New conversation started with ID: ${newConversationId}`);
      console.log(conversations[newConversationId].history);

      return res.status(200).send({
        conversationId: newConversationId,
        bot: botResponse,
      });
    }

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const botResponse = response.text();

    conversations[conversationId].history.push(
      { role: 'user', text: prompt },
      { role: 'model', text: botResponse },
    );

    console.log(`Continued conversation with ID: ${conversationId}`);
    console.log(conversations[conversationId].history);

    res.status(200).send({
      bot: botResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error || 'Error');
  }
});

app.listen(5000, () => console.log('Server started on http://localhost:5000'));
