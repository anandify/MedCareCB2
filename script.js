import bot from './assets/doctorsahab.svg'
import user from './assets/pregnant_lady_adobe_express.svg'
import mic from './assets/mic.svg'
import mic2 from '/assets/mic2.svg'

const form = document.querySelector('form')
const chatContainer = document.querySelector('#chat_container')

//welcome messages
const welcomeMessages = [
  "👋 Hi there! Welcome to Mamta! How can I assist you today?",
  "👋 Hi, I'm Mamta, your personalized pregnancy assistant, Ask me anything!",
  "👋 Hi there! Mamta is here to assist you with your pregnancy questions. Feel free to ask!",
  "🌸 Hello! Welcome to Mamta. Let me know how I can help you with your pregnancy journey.",
];
async function displayWelcomeMessage() {
  // Select a random welcome message
  const welcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];

  // bot's chatstripe
  const uniqueId = generateUniqueId();
  chatContainer.innerHTML += chatStripe(true, " ", uniqueId);

  // specific message div 
  const messageDiv = document.getElementById(uniqueId);

  // messageDiv.innerHTML = "..."
  loader(messageDiv);

  // Simulate a delay to mimic the bot's response time
  await new Promise(resolve => setTimeout(resolve, 2500));

  clearInterval(loadInterval);
  messageDiv.innerHTML = " ";

  typeText(messageDiv, welcomeMessage);
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

// generate unique ID for each message div of bot
// necessary for typing text effect for that specific reply
// without unique ID, typing text will work on every element
function generateUniqueId() {
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

  // user's chatstripe
  chatContainer.innerHTML += chatStripe(false, data.get('prompt'));

  // to clear the textarea input 
  form.reset();

  // bot's chatstripe
  const uniqueId = generateUniqueId();
  chatContainer.innerHTML += chatStripe(true, " ", uniqueId);

  // to focus scroll to the bottom 
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // specific message div 
  const messageDiv = document.getElementById(uniqueId);

  // messageDiv.innerHTML = "..."
  loader(messageDiv);

  try {
    const response = await fetch('http://localhost:5000/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: data.get('prompt'),
        conversationId: localStorage.getItem('conversationId') || null,
      }),
    });

    clearInterval(loadInterval);
    messageDiv.innerHTML = " ";

    if (response.ok) {
      const responseData = await response.json();
      const parsedData = responseData.bot.trim(); // trims any trailing spaces/'\n' 

      typeText(messageDiv, parsedData);

      // Store the conversation ID for future requests
      if (responseData.conversationId) {
        localStorage.setItem('conversationId', responseData.conversationId);
      }
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
        content = '<h2>Previous Chats</h2><p>List of previous chats...</p>';
        break;
      case 'documents':
        content = '<h2>Documents</h2><p>Uploaded documents here...</p>';
        break;
      case 'about':
        content = '<h2>About</h2><p>About the application...</p>';
        break;
    }
    menuDetails.innerHTML = content;
  }

  // Initially display previous chats details
  updateMenuDetails('previousChats');
  
});
