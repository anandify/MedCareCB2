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

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    token: params.get('token'),
    user: params.get('user') ? JSON.parse(decodeURIComponent(params.get('user'))) : null,
  };
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

  // FIXES - Unecessary welcome messages on user history - bad design
  // conversationHistory.push({ role: 'bot', text: welcomeMessage });
  // allConversations[sessionId] = conversationHistory;
  // saveSessionData();
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

// Menu Bar Elements
const arrowButton = document.getElementById('arrow-button');
const menu = document.getElementById('menu');
const app = document.getElementById('app');
const menuDetails = document.getElementById('menuDetails');
const darkModeToggle = document.getElementById('darkModeToggle');
const aboutBtn = document.getElementById('aboutBtn');

// Toggle menu with animation
arrowButton.addEventListener('click', () => {
  menu.classList.toggle('open');
  arrowButton.classList.toggle('open');
  if (menu.classList.contains('open')) {
    app.style.transform = 'translateX(300px)';
  } else {
    app.style.transform = 'translateX(0)';
  }
  updateMenuDetails('previousChats'); // Default to showing previous chats
});

// Section buttons
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

// Updated menu details function to handle all sections, including login and user details
function updateMenuDetails(section, user = null) {
  let content = '';
  user = user || JSON.parse(localStorage.getItem('user')); // Fetch from localStorage if not passed

  switch (section) {
    case 'login':
      if (user) {
        // Ensure the user object properties are accessed correctly
        const userName = user.name ? `${user.name.givenName} ${user.name.familyName}` : '[Name not provided]';
        const userEmail = user.email || '[Email not provided]';
        const userPicture = user.picture || 'https://via.placeholder.com/60';
        const userAge = user.age || 'Not provided';
        const userBloodGroup = user.bloodGroup || 'Not provided';

        content = `
          <h2>Welcome, ${userName}</h2>
          <img src="${userPicture}" alt="Profile Picture" style="width:60px; border-radius:50%;">
          <p>Email: ${userEmail}</p>
          <ul>
            <li>Age: ${userAge}</li>
            <li>Blood Group: ${userBloodGroup}</li>
          </ul>
          <button id="logoutButton">Logout</button>`;
      } else {
        // If user is not logged in, show login button
        content = `
          <h2>Login</h2>
          <button id="loginButton">Login with Google</button>
        `;
      }
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

  // Update menu details container
  menuDetails.innerHTML = content;

  // Add event listeners for buttons (like login, new chat, clear history)
  if (document.getElementById('loginButton')) {
    document.getElementById('loginButton').addEventListener('click', () => {
      window.location.href = 'http://localhost:5000/auth/google'; // Trigger Google OAuth login
    });
  }

  if (document.getElementById('logoutButton')) {
    document.getElementById('logoutButton').addEventListener('click', logoutUser);
  }

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
  chatContainer.innerHTML = ''; // Clear chat container
  // FIXING unecessary welcome msg loads, - temporarily
  const uniqueId = generateStripId();
  chatContainer.innerHTML += chatStripe(true, " 🌸 Hello! Welcome to Mamta. Let me know how I can help you with your pregnancy journey.", uniqueId);
  conversationHistory.forEach(entry => {
      const uniqueId = generateStripId();
      chatContainer.innerHTML += chatStripe(entry.role === 'bot', entry.text, uniqueId);
  });
};

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

// Function to clear conversation history
function clearConversationHistory() {
  allConversations = {};
  conversationHistory = [];
  saveSessionData(); // Save updated history
  updateMenuDetails('previousChats');
  clearSessionData()
}

// DEV ONLY
function clearSessionData() {
  localStorage.removeItem('sessionId');
  localStorage.removeItem('conversationHistory');
  localStorage.removeItem('allConversations');
}

// Function to handle user logout
function logoutUser() {
  fetch('http://localhost:5000/logout', {
    method: 'POST',
    credentials: 'include',
  })
    .then(() => {
      // Reset menu and show login button
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      updateMenuDetails('login');
    })
    .catch(error => console.error('Logout failed:', error));
}

// Style for new chat and clear history buttons
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

// Initially display previous chats
// updateMenuDetails('previousChats');

// Check for token and user data in the URL
const { token, user } = getQueryParams();

if (token && user) {
  // Store token and user details in localStorage (or sessionStorage)
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));

  // Update the menu with user info
  updateMenuDetails('login', user);

  // Optionally, you can remove the token and user from the URL to clean up the address bar
  //window.history.replaceState({}, document.title, window.location.pathname);
}



// Example function to log out
function logoutUser() {
  // Clear stored data
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');

  // Update the menu to show login button again
  updateMenuDetails('login');
}

// Automatically show user details if already logged in (i.e., data exists in localStorage)
const storedUser = JSON.parse(localStorage.getItem('user'));
if (storedUser) {
  updateMenuDetails('login', storedUser);
}

  
});
