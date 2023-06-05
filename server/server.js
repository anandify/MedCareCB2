import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import { Configuration, OpenAIApi } from 'openai'

dotenv.config()

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Hi!, I am Mamta, A chatbot that helps you in your pregnancy.'
  })
})

app.post('/', async (req, res) => {
  try {
    const prompt = req.body.prompt;
    //const name = 'Khushi';
    //const trimonth = '4';//the current month of the trimester
    //const medical='Diabetes'//append more
    const history = `You arae a chatbot that helps pregnant women. (The woman is already pregnant so please dont ask unnecessary questions).`;
    //const history = `You are a chatbot that helps pregnant women. (The woman is already pregnant so please dont ask unessecary questions) Name of the Patient: ${name}`;
    
    
    const GPT35TurboMessage = [
      { role: "system", content: `${history}` },
      {
        role: "user",
        content: `${prompt}`,
      },
      {
        role: "assistant",
        content: "Chatbot that answers questions of pregnant women.",
      }
    ];
    let GPT35Turbo = async (message) => {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: message,
      });
      
      res.status(200).send({
         bot: response.data.choices[0].message.content
      });
  
    };
    console.log("### I'm GPT-3.5-TURBO. ####", await GPT35Turbo(GPT35TurboMessage));
    

  } catch (error) {
    console.error(error)
    res.status(500).send(error || 'Error');
  }
})

app.listen(5000, () => console.log('Server started on http://localhost:5000'))
