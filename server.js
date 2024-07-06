import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: 'You are a chatbot that helps pregnant women. (The woman is already pregnant so please don’t ask unnecessary questions).',
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Hi!, I am Mamta, a chatbot that helps you in your pregnancy.',
  });
});

app.post('/', async (req, res) => {
  try {
    const prompt = req.body.prompt;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const botResponse = response.text();

    res.status(200).send({
      bot: botResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error || 'Error');
  }
});

app.listen(5000, () => console.log('Server started on http://localhost:5000'));
