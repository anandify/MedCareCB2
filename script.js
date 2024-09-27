import bot from './assets/doctorsahab.svg'
import user from './assets/pregnant_lady_adobe_express.svg'
import mic from './assets/mic.svg'
import mic2 from '/assets/mic2.svg'
import { v4 as uuidv4 } from 'uuid';

const form = document.querySelector('form');
const chatContainer = document.querySelector('#chat_container');
const menuDetails = document.querySelector('#menuDetails');

// Initialize or retrieve the session ID and conversation history
let sessionId = localStorage.getItem('sessionId') || uuidv4();
let conversationHistory = JSON.parse(localStorage.getItem('conversationHistory')) || [];
let allConversations = JSON.parse(localStorage.getItem('allConversations')) || {};

// Save session data in local storage
function saveSessionData() {
  localStorage.setItem('sessionId', sessionId);
  localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
  localStorage.setItem('allConversations', JSON.stringify(allConversations));
}

// Function to start a new session
function startNewSession() {
  sessionId = uuidv4();
  allConversations[sessionId] = [];
  conversationHistory = [];
  saveSessionData();
  chatContainer.innerHTML = ''; // Clear the chat container
  displayWelcomeMessage();
  updateMenuDetails('previousChats'); // Update the menu to show the new session
}

//welcome messages
async function displayWelcomeMessage() {
  const welcomeMessages = [
    "👋 Hi there! Welcome to Mamta! How can I assist you today?",
    "👋 Hi, I'm Mamta, your personalized pregnancy assistant. Ask me anything!",
    "👋 Hi there! Mamta is here to assist you with your pregnancy questions. Feel free to ask!",
    "🌸 Hello! Welcome to Mamta. Let me know how I can help you with your pregnancy journey.",
  ];
  const welcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];

  const uniqueId = generateStripId();
  chatContainer.innerHTML += chatStripe(true, " ", uniqueId);

  const messageDiv = document.getElementById(uniqueId);
  loader(messageDiv);

  await new Promise(resolve => setTimeout(resolve, 2500));

  clearInterval(loadInterval);
  messageDiv.innerHTML = " ";

  typeText(messageDiv, welcomeMessage);

  conversationHistory.push({ role: 'bot', text: welcomeMessage });
  allConversations[sessionId] = conversationHistory;
  saveSessionData();
}

//typing effect
let loadInterval

function loader(element) {
    element.textContent = ''

    loadInterval = setInterval(() => {
        // Update the text content of the loading indicator
        element.textContent += '.';

        // If the loading indicator has reached three dots, reset it
        if (element.textContent === '....') {
            element.textContent = '';
        }
    }, 300);
}

function typeText(element, text) {
    let index = 0

    let interval = setInterval(() => {
        if (index < text.length) {
            element.innerHTML += text.charAt(index)
            index++
        } else {
            clearInterval(interval)
        }
    }, 20)
}

// generate strip ID for each message div of bot
// necessary for typing text effect for that specific reply
// without strip ID, typing text will work on every element
function generateStripId() {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    const hexadecimalString = randomNumber.toString(16);

    return `id-${timestamp}-${hexadecimalString}`;
}

function chatStripe(isAi, value, uniqueId) {
    return (
        `
        <div class="wrapper ${isAi && 'ai'}">
            <div class="chat">
                <div class="profile">
                    <img 
                      src=${isAi ? bot : user} 
                      alt="${isAi ? 'bot' : 'user'}" 
                    />
                </div>
                <div class="message" id=${uniqueId}>${value}</div>
            </div>
        </div>
    `
    )
}

const handleSubmit = async (e) => {
  e.preventDefault();

  const data = new FormData(form);
  const userMessage = data.get('prompt');

  chatContainer.innerHTML += chatStripe(false, userMessage);

  form.reset();

  const uniqueId = generateStripId();
  chatContainer.innerHTML += chatStripe(true, " ", uniqueId);

  chatContainer.scrollTop = chatContainer.scrollHeight;

  const messageDiv = document.getElementById(uniqueId);

  loader(messageDiv);

  conversationHistory.push({ role: 'user', text: userMessage });
  allConversations[sessionId] = conversationHistory;
  saveSessionData();

  try {
    const response = await fetch('http://localhost:5000/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: userMessage,
        conversationId: sessionId|| null,
      }),
    });

    clearInterval(loadInterval);
    messageDiv.innerHTML = " ";

    if (response.ok) {
      const responseData = await response.json();
      console.log(responseData);
      const botMessage = responseData.bot.trim();

      typeText(messageDiv, botMessage);

      conversationHistory.push({ role: 'bot', text: botMessage });
      allConversations[sessionId] = conversationHistory;
      saveSessionData();
    } else {
      const err = await response.text();
      messageDiv.innerHTML = "Something went wrong";
      alert(err);
    }
  } catch (error) {
    console.error('Error:', error);
    messageDiv.innerHTML = "Something went wrong";
  }
};

form.addEventListener('submit', handleSubmit);
form.addEventListener('keyup', (e) => {
  if (e.keyCode === 13) {
    handleSubmit(e);
  }
});

displayWelcomeMessage();


// Speech to text:-
// Check for browser compatibility
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    // Create a new SpeechRecognition object
    var recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  
    // Set the recognition language
    recognition.lang = 'en-US';
  
    // Set interim results to improve responsiveness
    recognition.interimResults = true;
  
    // Define the event handlers for the recognition events
    recognition.onstart = function () {
      console.log('Speech recognition started...');
    };
  
    recognition.onresult = function (event) {
      var result = event.results[event.results.length - 1];
      var transcript = result[0].transcript;
      var confidence = result[0].confidence;
  
      // Display the result in the textarea
      var textarea = document.querySelector('textarea[name="prompt"]');
      textarea.value = transcript;
    };
  
    recognition.onerror = function (event) {
      console.error('Speech recognition error:', event.error);
    };
  
    recognition.onend = function () {
      console.log('Speech recognition ended.');
  
      // Add a small delay before sending the input
      setTimeout(function () {
        // Automatically click the send button
        var sendButton = document.querySelector('button[type="submit"]');
        sendButton.click();
      }, 1000); // 500ms delay
    };
  
    // Start or stop the recognition when the microphone button is clicked
    var isRecognizing = false;
    var micButton = document.getElementById('micButton');
    micButton.addEventListener('click', function () {
      if (!isRecognizing) {
        recognition.start();
        isRecognizing = true;
        micButton.innerHTML = `<img src=${mic} alt="microphone" />`;
      } else {
        recognition.stop();
        isRecognizing = false;
        micButton.innerHTML = `<img src=${mic2} alt="microphone" />`;
      }
    });
    
  } else {
    console.error('Speech recognition not supported.');
  }
  
//Loading Screen
window.addEventListener("load", function () {
  const loadingOverlay = document.getElementById("loading-overlay");
  const loadingImage = document.querySelector(".loading-image");
  const logoOverlay = document.querySelector(".logo-overlay");

  setTimeout(function () {
    logoOverlay.classList.add("fade-out");
  }, 500);

  setTimeout(function () {
    loadingImage.classList.add("fade-out");
    setTimeout(function () {
      loadingOverlay.style.display = "none";
    }, 500);
  }, 1000);

  //Menu Bar
  const arrowButton = document.getElementById('arrow-button');
  const menu = document.getElementById('menu');
  const app = document.getElementById('app');
  const menuDetails = document.getElementById('menuDetails');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const aboutBtn = document.getElementById('aboutBtn');

  arrowButton.addEventListener('click', () => {
    menu.classList.toggle('open');
    arrowButton.classList.toggle('open');
    if (menu.classList.contains('open')) {
      app.style.transform = 'translateX(300px)';
    } else {
      app.style.transform = 'translateX(0)';
    }
    updateMenuDetails('previousChats');
  });

  document.getElementById('loginBtn').addEventListener('click', () => {
    updateMenuDetails('login');
  });

  document.getElementById('previousChatsBtn').addEventListener('click', () => {
    updateMenuDetails('previousChats');
  });

  document.getElementById('documentsBtn').addEventListener('click', () => {
    updateMenuDetails('documents');
  });

  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });

  aboutBtn.addEventListener('click', () => {
    updateMenuDetails('about');
  });

  function updateMenuDetails(section) {
    let content = '';
    switch (section) {
      case 'login':
        content = '<h2>Login</h2><p>Login form and details here...</p>';
        break;
      case 'previousChats':
        content = '<h2>Previous Chats</h2><ul>';
        for (const [id, history] of Object.entries(allConversations)) {
          content += `<li><a href="#" onclick="loadConversation('${id}')">${id}</a></li>`;
        }
        content += '</ul><button id="newChatButton">New Chat</button><button id="clearHistoryButton">Clear History</button>';
        break;
      case 'documents':
        content = '<h2>Documents</h2><p>Uploaded documents here...</p>';
        break;
      case 'about':
        content = '<h2>About</h2><p>About the application...</p>';
        break;
    }
    menuDetails.innerHTML = content;
  
    if (section === 'previousChats') {
      const newChatButton = document.getElementById('newChatButton');
      newChatButton.addEventListener('click', startNewSession);
  
      const clearHistoryButton = document.getElementById('clearHistoryButton');
      clearHistoryButton.addEventListener('click', clearConversationHistory);
    }
  }
  
  // Function to load conversation history
  window.loadConversation = function (id) {
    sessionId = id;
    conversationHistory = allConversations[id] || [];
    chatContainer.innerHTML = ''; // Clear the chat container
    conversationHistory.forEach(entry => {
      const uniqueId = generateStripId();
      chatContainer.innerHTML += chatStripe(entry.role === 'bot', entry.text, uniqueId);
    });
  };
  
  // Function to clear conversation history
  function clearConversationHistory() {
    allConversations = {};
    conversationHistory = [];
    saveSessionData();
    updateMenuDetails('previousChats');
  }
  
  // Style the new chat button
  const style = document.createElement('style');
  style.innerHTML = `
    #newChatButton, #clearHistoryButton {
      background-color: #4CAF50;
      border: none;
      color: white;
      padding: 10px 20px;
      text-align: center;
      text-decoration: none;
      display: inline-block;
      font-size: 16px;
      margin: 4px 2px;
      cursor: pointer;
      transition-duration: 0.4s;
    }
  
    #newChatButton:hover, #clearHistoryButton:hover {
      background-color: white;
      color: black;
      border: 2px solid #4CAF50;
    }
  `;
  document.head.appendChild(style);

  // Initially display previous chats details
  //updateMenuDetails('previousChats');
  
});
